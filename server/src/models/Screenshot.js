const mongoose = require('mongoose');

const ScreenshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    ocrText: {
      type: String,
      default: '',
    },
    caption: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      enum: ['Payments', 'Chats', 'Study', 'Code', 'Tickets', 'Other'],
      default: 'Other',
      index: true,
    },
    fileHash: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    format: {
      type: String,
    },
    bytes: {
      type: Number,
    },
    hasSensitiveData: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Text index across ocrText, caption, and tags
ScreenshotSchema.index(
  {
    ocrText: 'text',
    caption: 'text',
    tags: 'text',
  },
  {
    weights: {
      ocrText: 10,
      caption: 5,
      tags: 3,
    },
    name: 'ScreenshotTextIndex',
  }
);

// Per-user indexes for isolation, duplicate detection, and fast sorting
ScreenshotSchema.index({ userId: 1, fileHash: 1 });
ScreenshotSchema.index({ userId: 1, createdAt: -1 });
ScreenshotSchema.index({ userId: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('Screenshot', ScreenshotSchema);
