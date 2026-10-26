# 📸 ishot — Searchable Screenshot Library

> **Tech for Social Good Hackathon Submission**  
> Powered by **Cloudinary** (Media Storage, CDN, and Dynamic Optimizations: `f_auto,q_auto,w_400`) & **Google Gemini Flash Vision** (Multilingual OCR, AI Captioning, Auto-Tagging, Categorization, and Sensitive Data Detection).

---

## 🌟 Overview

**ishot** turns screenshot clutter into an instantly searchable, organized visual knowledge base with strict per-user data isolation:
- **Per-User Authentication & Vault Isolation**: Every user only ever sees, searches, downloads, and deletes their own screenshots.
- **Zero-Add-on Cloudinary Storage**: Uploads, delivers, and deletes screenshots into per-user Cloudinary folders (`findshot/<userId>`).
- **Google Gemini Flash Vision**: Analyzes image bytes in one fast call:
  - **Multilingual OCR**: Extracts all readable text in reading order (English, Hindi, and any other language).
  - **AI Captioning**: Generates concise, descriptive alt text sentences.
  - **Auto-Tagging**: Extracts 5 to 8 relevant lowercase tags.
  - **Auto-Categorization**: Automatically classifies into `Payments`, `Chats`, `Study`, `Code`, `Tickets`, or `Other`.
  - **Sensitive Data Detection**: Flags OTPs, passwords, full card numbers, CVVs, PINs, or Aadhaar/SSN IDs with a visible **"Sensitive"** warning badge.
- **Instant Search with Snippets & Highlighting**: 300ms debounced search filtered strictly by `userId` using MongoDB compound text index with regex fallback.
- **Desktop Folder Watcher**: Background Node.js script using `chokidar` that authenticates on start, handles 401 re-login, and auto-uploads new screenshots.
- **Quota & Abuse Protection**: Helmet security headers, rate limiting on APIs and auth, and a per-user cap (`MAX_UPLOADS_PER_USER=25`) returning HTTP 429 when reached.

---

## 🔐 Per-User Authentication & Data Isolation

1. **User Authentication**:
   - `POST /api/auth/register`: Validates email and password (minimum 8 characters), stores bcrypt password hashes, and returns a 7-day JWT token with user info.
   - `POST /api/auth/login`: Verifies credentials and returns generic error messages (*"Invalid email or password"*) to prevent account enumeration.
   - `GET /api/auth/me`: Verifies the Bearer JWT and returns current user details.
2. **Strict Data Scoping**:
   - All screenshot queries (`find`, `search`, `stats`, `count`, `aggregate`) automatically enforce `{ userId: req.user.id }`.
   - Single item operations (`GET /api/screenshots/:id`, `DELETE /api/screenshots/:id`) enforce `{ _id, userId }`. Requests for another user's screenshot return `404 Not Found`.
   - Deduplication is strictly per-user: two different users can independently upload the same file without conflict (`{ userId, fileHash }`).
   - Cloudinary assets are saved into per-user directories (`findshot/<userId>`) and deleted only if the item belongs to the requesting user.
3. **Upload Quota Protection**:
   - Each account has a configurable cap (default 25 uploads via `MAX_UPLOADS_PER_USER`).
   - When the quota is reached, the API returns `429 Too Many Requests` with a clear message.

---

## 🏗️ Project Architecture

```
ishot/
├── client/              # React 18 + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/  # Header, AuthPage, SearchBar, FilterBar, Dropzone, Grid, Modal, Toast
│   │   ├── context/     # AuthContext (JWT & session) & ThemeContext (Dark/Light)
│   │   ├── services/    # API Client (Bearer token, 401 auto-logout, 429 quota handling)
│   │   └── utils/       # Cloudinary transformation helpers & HighlightText
│   └── package.json
│
├── server/              # Node.js + Express API
│   ├── src/
│   │   ├── config/      # Cloudinary, Gemini, and MongoDB connections
│   │   ├── controllers/ # Auth & isolated Screenshot CRUD & Search
│   │   ├── middleware/  # Auth Bearer verification, rate limiters, helmet, multer
│   │   ├── models/      # User (bcrypt) & Screenshot (userId, compound index, text index)
│   │   ├── routes/      # /api/auth, /api/screenshots, /api/upload, /api/stats
│   │   ├── scripts/     # clearOldData.js (manual cleanup script for legacy screenshots)
│   │   └── services/    # Cloudinary per-user storage, Gemini Flash Vision
│   ├── tests/           # Automated auth & data isolation test suite (15 tests)
│   └── package.json
│
├── watcher/             # Desktop Folder Watcher (chokidar)
│   ├── watch.js         # Auto-authenticating upload script with 401 recovery & retries
│   ├── sample-screenshots/ # Sample test files
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

# Allowed Client Origins for CORS (comma-separated)
CLIENT_ORIGINS=http://localhost:5173,https://your-app.vercel.app

# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/ishot?retryWrites=true&w=majority

# Cloudinary Credentials (Required for uploads & CDN delivery)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=findshot

# Google Gemini API Key (For OCR, Captioning, Tags & Sensitive Data Detection)
GEMINI_API_KEY=your_gemini_api_key

# Authentication & JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters

# Upload Quota (Default 25 screenshots per user)
MAX_UPLOADS_PER_USER=25
```

### 2. `client/.env`
```env
# Backend API URL (Production & Local)
VITE_API_URL=http://localhost:5000/api
```

### 3. `watcher/.env`
```env
SCREENSHOT_DIR=./screenshots
API_URL=http://localhost:5000/api/upload

# ishot user credentials (authenticated per-user uploads)
# The watcher will automatically log in and attach the Bearer token
ISHOT_EMAIL=your_email@example.com
ISHOT_PASSWORD=your_password_here

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

### 3. Setting Up the Folder Watcher
1. Configure credentials in `watcher/.env`:
   ```env
   ISHOT_EMAIL=user@example.com
   ISHOT_PASSWORD=password123
   ```
2. Start the watcher:
   ```bash
   cd watcher
   npm start
   ```
The watcher automatically logs in on startup via `POST /api/auth/login`, retrieves the JWT token, and sends `Authorization: Bearer <token>` with every file uploaded. If a 401 response occurs, it automatically re-authenticates and retries.

---

## 🧹 Manual Data Migration / Cleanup (`clearOldData.js`)

If you had screenshots uploaded before user authentication was added, they will not have a `userId` assigned. A one-off script is provided to delete legacy unassigned screenshots and remove their Cloudinary media:

```bash
cd server
node src/scripts/clearOldData.js
```
> **Note**: This script is NOT executed automatically. Run it manually when you are ready to purge pre-auth test data.

---

## 🧪 Verification & Automated Tests

Run the comprehensive authentication and data isolation test suite:

```bash
cd server
npm run test:auth
```

**Test Coverage (15 Automated Tests)**:
- Requests without a token return `401 Unauthorized`.
- Password validation (minimum 8 characters) on registration.
- Generic error messages on invalid login credentials.
- `GET /api/auth/me` verifies identity.
- User A uploads a screenshot; User B cannot list it, search it, fetch it by ID (`404`), or delete it (`404`).
- Same screenshot file uploaded by two users is saved for both (per-user deduplication).
- Re-upload of the same file by the same user is recognized as a duplicate.
- Per-user upload cap (`MAX_UPLOADS_PER_USER`) triggers HTTP `429 Too Many Requests`.

---

## 🔒 Security & Privacy Features
- **Zero Plaintext Storage**: Passwords are cryptographically salted and hashed using `bcryptjs`.
- **JWT Protection**: Expiration enforced at 7 days. Tokens are stored in localStorage and attached to every API request.
- **Helmet Security Headers**: Enforces secure HTTP response headers.
- **Strict CORS**: Only origins explicitly listed in `CLIENT_ORIGINS` are accepted.
- **Strict Rate Limiting**: Dedicated rate limiting on login/register endpoints and upload endpoints, plus general API protection.
- **Zero Secret Leakage**: Passwords and JWT tokens are never logged or exposed in responses.
