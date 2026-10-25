require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const chokidar = require('chokidar');
const axios = require('axios');
const FormData = require('form-data');

const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || './screenshots';
const API_URL = process.env.API_URL || 'http://localhost:5000/api/upload';
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES, 10) || 3;
const RETRY_DELAY_MS = parseInt(process.env.RETRY_DELAY_MS, 10) || 1500;

// Resolve screenshot dir to absolute path
const resolvedWatchDir = path.resolve(SCREENSHOT_DIR);

// Ensure the watch directory exists
if (!fs.existsSync(resolvedWatchDir)) {
  fs.mkdirSync(resolvedWatchDir, { recursive: true });
  console.log(`📁 [Watcher] Created screenshot watch directory at: ${resolvedWatchDir}`);
}

// In-memory set of file hashes processed in this session to prevent re-uploading
const processedHashes = new Set();
// Track files currently being uploaded to avoid race conditions
const pendingUploads = new Set();

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function computeFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function formatTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

async function uploadWithRetry(filePath, attempt = 1) {
  const fileName = path.basename(filePath);
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    const errorMsg =
      error.response?.data?.error || error.message || 'Unknown network error';

    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `⚠️ [${formatTimestamp()}] [Attempt ${attempt}/${MAX_RETRIES}] Upload failed for "${fileName}" (${errorMsg}). Retrying in ${delay / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return uploadWithRetry(filePath, attempt + 1);
    } else {
      throw new Error(`Failed after ${MAX_RETRIES} attempts: ${errorMsg}`);
    }
  }
}

async function handleNewFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return;
  }

  const fileName = path.basename(filePath);

  if (pendingUploads.has(filePath)) {
    return;
  }

  pendingUploads.add(filePath);

  try {
    // 1. Verify file exists and has size > 0
    if (!fs.existsSync(filePath)) {
      pendingUploads.delete(filePath);
      return;
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      pendingUploads.delete(filePath);
      return;
    }

    // 2. Check duplicate hash locally
    const fileHash = computeFileHash(filePath);
    if (processedHashes.has(fileHash)) {
      console.log(
        `⏭️  [${formatTimestamp()}] Skipped duplicate local file: "${fileName}" (Hash: ${fileHash.slice(0, 8)}...)`
      );
      pendingUploads.delete(filePath);
      return;
    }

    console.log(`📸 [${formatTimestamp()}] New screenshot detected: "${fileName}" (${(stats.size / 1024).toFixed(1)} KB). Uploading to ishot...`);

    // 3. Upload to API
    const result = await uploadWithRetry(filePath);

    processedHashes.add(fileHash);

    if (result.duplicate) {
      console.log(
        `ℹ️  [${formatTimestamp()}] Server reported existing duplicate for "${fileName}". Library reference preserved.`
      );
    } else {
      const category = result.screenshot?.category || 'Other';
      const snippet = result.screenshot?.snippet || result.screenshot?.caption || 'No text extracted';
      console.log(
        `✅ [${formatTimestamp()}] Successfully processed "${fileName}"`
      );
      console.log(`   🏷️  Category: [${category}]`);
      console.log(`   📝 Snippet: "${snippet.slice(0, 90)}${snippet.length > 90 ? '...' : ''}"`);
      console.log(`   🔗 URL: ${result.screenshot?.url || 'N/A'}\n`);
    }
  } catch (err) {
    console.error(`❌ [${formatTimestamp()}] Error uploading "${fileName}":`, err.message);
  } finally {
    pendingUploads.delete(filePath);
  }
}

function startWatcher() {
  console.log('====================================================');
  console.log('👀  ishot Screenshot Folder Watcher Active');
  console.log(`📂  Watching directory: ${resolvedWatchDir}`);
  console.log(`🎯  Target API:        ${API_URL}`);
  console.log(`🔄  Max Retries:       ${MAX_RETRIES}`);
  console.log('====================================================\n');
  console.log('Waiting for new screenshots (.png, .jpg, .jpeg, .webp)...');

  const watcher = chokidar.watch(resolvedWatchDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true, // Don't upload pre-existing files on startup
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 200,
    },
  });

  watcher
    .on('add', (filePath) => handleNewFile(filePath))
    .on('error', (error) => console.error('Watcher error:', error));

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 Stopping screenshot watcher...');
    watcher.close().then(() => {
      console.log('Watcher closed. Goodbye!');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  startWatcher();
}

module.exports = { startWatcher, handleNewFile, computeFileHash };
