# 📸 ishot — Searchable Screenshot Library

> **Tech for Social Good Hackathon Submission**  
> Powered by **Cloudinary** (Media Storage, CDN, and Dynamic Optimizations: `f_auto,q_auto,w_400`) & **Google Gemini Flash Vision** (Multilingual OCR, AI Captioning, Auto-Tagging, Categorization, and Sensitive Data Detection).

---

## 🌟 Overview

**ishot** turns screenshot clutter into an instantly searchable, organized visual knowledge base:
- **Zero-Add-on Cloudinary Storage**: Uploads, delivers, and deletes screenshots reliably via Cloudinary with dynamic format & quality optimizations (`f_auto,q_auto,w_400`).
- **Google Gemini Flash Vision**: Analyzes image bytes in one fast call:
  - **Multilingual OCR**: Extracts all readable text in reading order (English, Hindi, and any other language).
  - **AI Captioning**: Generates concise, descriptive alt text sentences.
  - **Auto-Tagging**: Extracts 5 to 8 relevant lowercase tags.
  - **Auto-Categorization**: Automatically classifies into `Payments`, `Chats`, `Study`, `Code`, `Tickets`, or `Other`.
  - **Sensitive Data Detection**: Flags OTPs, passwords, full card numbers, CVVs, PINs, or Aadhaar/SSN IDs with a visible **"Sensitive"** warning badge.
- **Instant Search with Snippets & Highlighting**: 300ms debounced search powered by MongoDB compound text index with regex fallback, displaying matched context snippets with search words highlighted.
- **Desktop Folder Watcher**: Background Node.js script using `chokidar` that auto-uploads new screenshots with SHA-256 deduplication and 3x retry resilience.
- **Accessibility & UX**: Keyboard navigation (`/` to focus search, `Esc` to close modal), dark/light mode, drag-and-drop multiple upload, and accessible focus outlines.

---

## 🏗️ Project Architecture

```
ishot/
├── client/              # React 18 + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/  # Header, SearchBar, FilterBar, Dropzone, Grid, Modal, Toast
│   │   ├── context/     # Dark/Light Mode Theme Provider
│   │   ├── services/    # API Client (upload, search, CRUD, stats)
│   │   └── utils/       # Cloudinary transformation helpers & HighlightText
│   └── package.json
│
├── server/              # Node.js + Express API
│   ├── src/
│   │   ├── config/      # Cloudinary, Gemini, and MongoDB connections
│   │   ├── controllers/ # Screenshot CRUD, search with snippets & duplicate check
│   │   ├── middleware/  # Multer memory storage & centralized error handler
│   │   ├── models/      # Mongoose Screenshot schema with Text Index & hasSensitiveData
│   │   └── services/    # Cloudinary storage, Gemini Flash Vision, categorizer fallback
│   ├── tests/           # Integration tests for upload, Gemini vision, duplicate check, and search
│   └── package.json
│
├── watcher/             # Desktop Folder Watcher (chokidar)
│   ├── watch.js         # Auto-upload script with retries & SHA-256 hashing
│   ├── sample-screenshots/ # Ready-to-test sample screenshots
│   └── package.json
│
└── README.md
```

---

## ⚙️ Environment Variables

### 1. `server/.env`
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# MongoDB Connection
# If left empty, an embedded in-memory MongoDB instance will be automatically started for local testing.
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/ishot?retryWrites=true&w=majority

# Cloudinary Credentials (Plain upload & CDN delivery — no add-ons required)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=findshot

# Google Gemini API Key (For OCR, Captioning, Tags & Sensitive Data Detection)
# Get a free key at https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key
```

### 2. `client/.env`
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. `watcher/.env`
```env
SCREENSHOT_DIR=./screenshots
API_URL=http://localhost:5000/api/upload
MAX_RETRIES=3
RETRY_DELAY_MS=1500
```

---

## 🚀 Running the App

### 1. Start the Backend API
```bash
cd server
npm run dev
# Running on http://localhost:5000
```

### 2. Start the Frontend App
```bash
cd client
npm run dev
# Running on http://localhost:5173
```

### 3. Start the Folder Watcher (Optional)
```bash
cd watcher
npm start
# Watching ./screenshots for new files
```

---

## 🧪 Verification & Automated Tests

Run the built-in integration test suites:

1. **Full API & Search Test**:
   ```bash
   cd server
   npm test
   ```
   *Expected: `7 passed, 0 failed`*

2. **Upload & Duplicate Pipeline Test** (Cloudinary + Gemini Flash Vision + MongoDB):
   ```bash
   cd server
   node tests/test-upload.js
   ```
   *Expected: `201 Created` on initial upload; `200 OK (duplicate: true)` on duplicate upload.*

3. **Sensitive Data Detection Test**:
   ```bash
   cd server
   node tests/test-sensitive.js
   ```
   *Expected: `Sensitive data detection verified!`*

4. **Frontend Production Build**:
   ```bash
   cd client
   npm run build
   ```
   *Expected: `✓ built in ~13s with 0 errors`*

---

## 🔒 Security & Privacy Features
- **Zero API Key Leakage**: Secrets and keys are never logged to console or returned to clients.
- **Sensitive Data Alerts**: Screenshots containing OTPs, cards, or passwords display a high-visibility badge on cards and an alert banner in the preview modal.
- **Sequential Rate Limiting**: Server queues Gemini Vision analyses sequentially with automatic retries to prevent rate limit spikes.
