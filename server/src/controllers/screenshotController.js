const crypto = require('crypto');
const mongoose = require('mongoose');
const Screenshot = require('../models/Screenshot');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryService');
const { analyzeScreenshotWithGemini } = require('../services/geminiService');
const { categorizeScreenshot } = require('../services/categorizerService');
const { generateSnippet } = require('../services/snippetService');

// Helper to safely escape regex special characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * POST /api/upload
 * Handles screenshot upload with quota enforcement, per-user deduplication,
 * Cloudinary per-user folder upload, and Gemini Flash vision analysis.
 */
async function uploadScreenshot(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please attach an image in the "file" or "image" field.',
      });
    }

    const userId = req.user.id;
    const maxUploads = parseInt(process.env.MAX_UPLOADS_PER_USER, 10) || 25;

    // 1. Quota check: ensure user has not exceeded max uploads limit
    const currentCount = await Screenshot.countDocuments({ userId });
    if (currentCount >= maxUploads) {
      return res.status(429).json({
        success: false,
        error: `Upload limit reached. You can store up to ${maxUploads} screenshots. Please delete older screenshots to upload new ones.`,
        limit: maxUploads,
        current: currentCount,
      });
    }

    const buffer = req.file.buffer;

    // 2. Compute SHA-256 hash to detect duplicates per user
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 3. Check if THIS user already uploaded this file
    const existing = await Screenshot.findOne({ userId, fileHash });
    if (existing) {
      const snippet = generateSnippet(existing);
      return res.status(200).json({
        success: true,
        message: 'Duplicate image detected. Screenshot already exists in your library.',
        duplicate: true,
        screenshot: {
          ...existing.toObject(),
          snippet,
        },
      });
    }

    // 4. Plain upload to Cloudinary in per-user folder (findshot/<userId>)
    const userFolder = `findshot/${userId}`;
    const cloudinaryData = await uploadToCloudinary(buffer, { folder: userFolder });

    // 5. Send image bytes to Gemini Flash for OCR, captioning, tags, category & sensitive check
    const geminiData = await analyzeScreenshotWithGemini(
      buffer,
      req.file.mimetype || 'image/png'
    );

    // 6. Category fallback: use keyword rules if Gemini left category empty or 'Other'
    let finalCategory = geminiData.category || 'Other';
    if ((!geminiData.category || geminiData.category === 'Other') && geminiData.ocrText) {
      const keywordCategory = categorizeScreenshot(geminiData.ocrText, geminiData.tags);
      if (keywordCategory !== 'Other') {
        finalCategory = keywordCategory;
      }
    }

    // 7. Save to MongoDB strictly bound to req.user.id
    const screenshot = await Screenshot.create({
      userId,
      publicId: cloudinaryData.publicId,
      url: cloudinaryData.url,
      ocrText: geminiData.ocrText || '',
      caption: geminiData.caption || '',
      tags: geminiData.tags || [],
      category: finalCategory,
      hasSensitiveData: Boolean(geminiData.hasSensitiveData),
      fileHash,
      width: cloudinaryData.width,
      height: cloudinaryData.height,
      format: cloudinaryData.format,
      bytes: cloudinaryData.bytes,
    });

    const snippet = generateSnippet(screenshot);

    res.status(201).json({
      success: true,
      message: 'Screenshot uploaded and processed successfully.',
      duplicate: false,
      screenshot: {
        ...screenshot.toObject(),
        snippet,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/search?q=&tag=&category=&from=&to=&sensitive=&page=&limit=
 * Search across ocrText, caption and tags strictly scoped to the authenticated user.
 */
async function searchScreenshots(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      q = '',
      tag = '',
      category = '',
      from = '',
      to = '',
      sensitive = '',
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Enforce user isolation on all searches
    const baseFilter = { userId };

    // Filter by category
    if (category && category !== 'All') {
      baseFilter.category = category;
    }

    // Filter by tag
    if (tag && tag.trim()) {
      baseFilter.tags = tag.trim().toLowerCase();
    }

    // Filter by sensitive data
    if (sensitive === 'true') {
      baseFilter.hasSensitiveData = true;
    } else if (sensitive === 'false') {
      baseFilter.hasSensitiveData = false;
    }

    // Filter by date range
    if (from || to) {
      baseFilter.createdAt = {};
      if (from) {
        baseFilter.createdAt.$gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        baseFilter.createdAt.$lte = toDate;
      }
    }

    let queryFilter = { ...baseFilter };
    let sort = { createdAt: -1 };
    let useTextScore = false;

    const searchQuery = q.trim();

    if (searchQuery) {
      // Step A: Attempt MongoDB text index search scoped to user
      try {
        const textFilter = {
          ...baseFilter,
          $text: { $search: searchQuery },
        };

        const textCount = await Screenshot.countDocuments(textFilter);

        if (textCount > 0) {
          queryFilter = textFilter;
          sort = { score: { $meta: 'textScore' }, createdAt: -1 };
          useTextScore = true;
        } else {
          // Fallback to regex if text search yielded 0 results (handles partial words, codes)
          const escaped = escapeRegex(searchQuery);
          const regex = new RegExp(escaped, 'i');
          queryFilter = {
            ...baseFilter,
            $or: [
              { ocrText: regex },
              { caption: regex },
              { tags: regex },
            ],
          };
        }
      } catch (textErr) {
        const escaped = escapeRegex(searchQuery);
        const regex = new RegExp(escaped, 'i');
        queryFilter = {
          ...baseFilter,
          $or: [
            { ocrText: regex },
            { caption: regex },
            { tags: regex },
          ],
        };
      }
    }

    // Execute query with pagination
    let queryPromise = Screenshot.find(queryFilter);

    if (useTextScore) {
      queryPromise = queryPromise
        .select({ score: { $meta: 'textScore' } })
        .sort(sort);
    } else {
      queryPromise = queryPromise.sort(sort);
    }

    const [screenshots, totalCount] = await Promise.all([
      queryPromise.skip(skip).limit(limitNum).lean(),
      Screenshot.countDocuments(queryFilter),
    ]);

    const enrichedResults = screenshots.map((item) => ({
      ...item,
      snippet: generateSnippet(item, searchQuery),
    }));

    res.json({
      success: true,
      query: searchQuery,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      screenshots: enrichedResults,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/screenshots
 * Get paginated list of screenshots for the current authenticated user (latest first).
 */
async function getAllScreenshots(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 12,
      category = '',
      tag = '',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId };
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (tag && tag.trim()) {
      filter.tags = tag.trim().toLowerCase();
    }

    const [screenshots, totalCount] = await Promise.all([
      Screenshot.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Screenshot.countDocuments(filter),
    ]);

    const enrichedResults = screenshots.map((item) => ({
      ...item,
      snippet: generateSnippet(item),
    }));

    res.json({
      success: true,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      screenshots: enrichedResults,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/screenshots/:id
 * Get single screenshot details by ID, strictly verifying ownership.
 */
async function getScreenshotById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    let screenshot = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      screenshot = await Screenshot.findOne({ _id: id, userId }).lean();
    }

    if (!screenshot) {
      screenshot = await Screenshot.findOne({ publicId: id, userId }).lean();
    }

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot not found.',
      });
    }

    res.json({
      success: true,
      screenshot: {
        ...screenshot,
        snippet: generateSnippet(screenshot),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/screenshots/:id
 * Delete from Cloudinary and MongoDB ONLY if it belongs to the authenticated user.
 */
async function deleteScreenshot(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    let screenshot = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      screenshot = await Screenshot.findOne({ _id: id, userId });
    }

    if (!screenshot) {
      screenshot = await Screenshot.findOne({ publicId: id, userId });
    }

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot not found.',
      });
    }

    // 1. Delete asset from Cloudinary
    if (screenshot.publicId) {
      try {
        await deleteFromCloudinary(screenshot.publicId);
      } catch (cloudErr) {
        console.warn(`⚠️ [Cloudinary] Failed to delete remote asset ${screenshot.publicId}:`, cloudErr.message);
      }
    }

    // 2. Delete from MongoDB
    await Screenshot.deleteOne({ _id: screenshot._id, userId });

    res.json({
      success: true,
      message: 'Screenshot deleted successfully from library and Cloudinary.',
      id: screenshot._id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/stats
 * Summary stats: total count, max uploads cap, count by category, popular tags strictly for the current user.
 */
async function getStats(req, res, next) {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const maxUploads = parseInt(process.env.MAX_UPLOADS_PER_USER, 10) || 25;

    const total = await Screenshot.countDocuments({ userId });

    const categoryAggregation = await Screenshot.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const categories = {
      All: total,
      Payments: 0,
      Chats: 0,
      Study: 0,
      Code: 0,
      Tickets: 0,
      Other: 0,
    };

    categoryAggregation.forEach((item) => {
      if (item._id && categories.hasOwnProperty(item._id)) {
        categories[item._id] = item.count;
      }
    });

    // Top tags aggregation for this user
    const tagAggregation = await Screenshot.aggregate([
      { $match: { userId: userObjectId } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]);

    const tags = tagAggregation.map((t) => ({ tag: t._id, count: t.count }));
    const sensitiveCount = await Screenshot.countDocuments({ userId, hasSensitiveData: true });

    res.json({
      success: true,
      total,
      maxUploads,
      categories,
      tags,
      sensitiveCount,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadScreenshot,
  searchScreenshots,
  getAllScreenshots,
  getScreenshotById,
  deleteScreenshot,
  getStats,
};
