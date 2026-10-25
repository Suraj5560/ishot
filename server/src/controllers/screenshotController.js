const crypto = require('crypto');
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
 * Handles screenshot upload to Cloudinary and Gemini Flash vision analysis.
 */
async function uploadScreenshot(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please attach an image in the "file" or "image" field.',
      });
    }

    const buffer = req.file.buffer;

    // 1. Compute SHA-256 hash to detect duplicates
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. Check if this file was already uploaded
    const existing = await Screenshot.findOne({ fileHash });
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

    // 3. Plain upload to Cloudinary (storage & CDN delivery)
    const cloudinaryData = await uploadToCloudinary(buffer);

    // 4. Send image bytes to Gemini Flash for OCR, captioning, tags, category & sensitive check
    const geminiData = await analyzeScreenshotWithGemini(
      buffer,
      req.file.mimetype || 'image/png'
    );

    // 5. Category fallback: use keyword rules if Gemini left category empty or 'Other'
    let finalCategory = geminiData.category || 'Other';
    if ((!geminiData.category || geminiData.category === 'Other') && geminiData.ocrText) {
      const keywordCategory = categorizeScreenshot(geminiData.ocrText, geminiData.tags);
      if (keywordCategory !== 'Other') {
        finalCategory = keywordCategory;
      }
    }

    // 6. Save to MongoDB
    const screenshot = await Screenshot.create({
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
 * GET /api/search?q=&tag=&category=&from=&to=&page=&limit=
 * Search across ocrText, caption and tags with text index + regex fallback.
 */
async function searchScreenshots(req, res, next) {
  try {
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

    const baseFilter = {};

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
      // Step A: Attempt MongoDB text index search first
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
          // Fallback to regex if text search yielded 0 results (handles partial words, symbols, codes)
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
        // If text index not ready or error, fallback to regex
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

    // Attach contextual snippet with highlighted keywords
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
 * Get paginated list of screenshots (latest first).
 */
async function getAllScreenshots(req, res, next) {
  try {
    const {
      page = 1,
      limit = 12,
      category = '',
      tag = '',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
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
 * Get single screenshot details by ID.
 */
async function getScreenshotById(req, res, next) {
  try {
    const { id } = req.params;
    let screenshot = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      screenshot = await Screenshot.findById(id).lean();
    }

    if (!screenshot) {
      screenshot = await Screenshot.findOne({ publicId: id }).lean();
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
 * Delete from Cloudinary and MongoDB.
 */
async function deleteScreenshot(req, res, next) {
  try {
    const { id } = req.params;
    let screenshot = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      screenshot = await Screenshot.findById(id);
    }

    if (!screenshot) {
      screenshot = await Screenshot.findOne({ publicId: id });
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
    await Screenshot.findByIdAndDelete(screenshot._id);

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
 * Summary stats: total count, count by category, popular tags.
 */
async function getStats(req, res, next) {
  try {
    const total = await Screenshot.countDocuments();

    const categoryAggregation = await Screenshot.aggregate([
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

    // Top tags aggregation
    const tagAggregation = await Screenshot.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]);

    const tags = tagAggregation.map((t) => ({ tag: t._id, count: t.count }));
    const sensitiveCount = await Screenshot.countDocuments({ hasSensitiveData: true });

    res.json({
      success: true,
      total,
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
