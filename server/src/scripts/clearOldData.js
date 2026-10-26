require('dotenv').config();
const { connectDB, closeDB } = require('../config/db');
const Screenshot = require('../models/Screenshot');
const { deleteFromCloudinary } = require('../services/cloudinaryService');

/**
 * One-off maintenance script to clean up legacy screenshots created before
 * per-user authentication and data isolation were introduced.
 *
 * Deletes all Screenshot documents that have no userId (or null) and deletes
 * their associated remote assets from Cloudinary.
 *
 * Manual Execution: node src/scripts/clearOldData.js
 */
async function clearOldData() {
  console.log('🧹 [clearOldData] Starting legacy screenshot cleanup...');
  await connectDB();

  try {
    const filter = {
      $or: [{ userId: { $exists: false } }, { userId: null }],
    };

    const oldScreenshots = await Screenshot.find(filter);
    console.log(`🔍 [clearOldData] Found ${oldScreenshots.length} legacy screenshots without a userId.`);

    if (oldScreenshots.length === 0) {
      console.log('✨ [clearOldData] No unassigned screenshots found. Everything is clean!');
      return;
    }

    let deletedCount = 0;
    let errorCount = 0;

    for (const item of oldScreenshots) {
      try {
        if (item.publicId) {
          console.log(`  🗑️ Deleting Cloudinary asset: ${item.publicId}`);
          await deleteFromCloudinary(item.publicId);
        }
        await Screenshot.deleteOne({ _id: item._id });
        deletedCount++;
      } catch (err) {
        console.error(`  ❌ Failed to delete screenshot ${item._id}:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 [clearOldData] Cleanup completed!`);
    console.log(`   - Deleted: ${deletedCount}`);
    console.log(`   - Errors:  ${errorCount}`);
  } catch (err) {
    console.error('❌ [clearOldData] Fatal script error:', err);
  } finally {
    await closeDB();
  }
}

if (require.main === module) {
  clearOldData();
}

module.exports = clearOldData;
