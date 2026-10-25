require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const { connectDB, closeDB } = require('../config/db');
const Screenshot = require('../models/Screenshot');
const { categorizeScreenshot } = require('../services/categorizerService');

const SAMPLE_SCREENSHOTS = [
  {
    publicId: 'findshot/seed_receipt_stripe',
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
    ocrText: `INVOICE #INV-2026-8891
Billed to: Acme Corp
Date: Oct 21, 2026
Items:
1. Cloud Cloudinary Media Storage Tier 2 - $120.00
2. OCR Text Processing API (10,000 units) - $45.00
Subtotal: $165.00
Tax (GST 18%): $29.70
Total Amount Paid: $194.70
Payment Method: Visa ending in 4242
Transaction ID: txn_9831a293fbc0
Status: Paid in Full`,
    caption: 'Invoice and payment receipt showing total amount of $194.70 paid via Visa',
    tags: ['invoice', 'receipt', 'payment', 'visa', 'stripe', 'billing'],
    width: 1200,
    height: 800,
    format: 'jpg',
    bytes: 142050,
  },
  {
    publicId: 'findshot/seed_chat_whatsapp',
    url: 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=1200&q=80',
    ocrText: `WhatsApp Chat with Design Team
Alex: Hey everyone, did you review the new mockups for ishot?
Sarah: Yes! The dark mode palette and search bar look super clean.
Alex: Awesome, remember we need to support the 300ms debounce and keyboard shortcut /.
Sarah: Already implemented with React hooks. Sending over the updated component now!
Today at 14:32 • Delivered • Read by everyone`,
    caption: 'WhatsApp group chat discussing ishot UI mockups and shortcut navigation',
    tags: ['whatsapp', 'chat', 'message', 'conversation', 'mobile', 'ui'],
    width: 1080,
    height: 1920,
    format: 'jpg',
    bytes: 215400,
  },
  {
    publicId: 'findshot/seed_study_calculus',
    url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80',
    ocrText: `Department of Mathematics - University Lecture Series
Chapter 4: The Fundamental Theorem of Calculus
Theorem 4.1: If f is continuous on [a, b], then the function g defined by
g(x) = ∫[a to x] f(t) dt for a ≤ x ≤ b
is continuous on [a, b] and differentiable on (a, b), and g'(x) = f(x).
Homework Assignment 3 Due Friday: Solve problems 12 through 28 on syllabus page 45.`,
    caption: 'University mathematics lecture slide on the Fundamental Theorem of Calculus',
    tags: ['lecture', 'calculus', 'mathematics', 'study', 'university', 'syllabus'],
    width: 1920,
    height: 1080,
    format: 'jpg',
    bytes: 310500,
  },
  {
    publicId: 'findshot/seed_code_react',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    ocrText: `import React, { useState, useEffect } from 'react';
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
// export default useDebounce; npm test passing 100%`,
    caption: 'VS Code editor showing custom React hook useDebounce with JavaScript syntax',
    tags: ['code', 'react', 'javascript', 'hooks', 'github', 'programming'],
    width: 1920,
    height: 1080,
    format: 'jpg',
    bytes: 280100,
  },
  {
    publicId: 'findshot/seed_ticket_flight',
    url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80',
    ocrText: `BOARDING PASS / ELECTRONIC TICKET
Airline: Pacific Skyways Flight: PS 442
Passenger: Alex Mercer
From: San Francisco (SFO) Terminal 2
To: Seattle (SEA) Gate B14
Departure: 08:45 AM Oct 29, 2026
Seat: 12F (Window) • Class: Economy
Booking Reference / PNR: 7K9L2M
Please arrive at the gate 30 minutes before departure.`,
    caption: 'Electronic airline boarding pass from SFO to SEA with seat 12F and PNR 7K9L2M',
    tags: ['boarding pass', 'flight', 'ticket', 'airline', 'travel', 'pnr'],
    width: 1200,
    height: 800,
    format: 'jpg',
    bytes: 185400,
  },
  {
    publicId: 'findshot/seed_payment_upi',
    url: 'https://images.unsplash.com/photo-1556742049-0a67e5572293?auto=format&fit=crop&w=1200&q=80',
    ocrText: `Payment Successful!
Paid to: Green Earth Foundation
Amount: ₹2,500.00
UPI Ref ID: 329048102941
Google Pay Transaction: GPay-UPI-8812903
Order ID: ORD-991204
Payment completed on Oct 22, 2026 at 11:15 AM
From Account: HDFC Bank A/c ending **8192`,
    caption: 'Mobile UPI payment receipt of ₹2,500 paid to Green Earth Foundation via Google Pay',
    tags: ['payment', 'upi', 'gpay', 'receipt', 'transaction', 'banking'],
    width: 1080,
    height: 1920,
    format: 'jpg',
    bytes: 198000,
  },
];

async function seedDatabase() {
  console.log('🌱 Starting ishot Database Seeding...');
  await connectDB();

  try {
    for (const item of SAMPLE_SCREENSHOTS) {
      const fileHash = crypto
        .createHash('sha256')
        .update(item.publicId)
        .digest('hex');

      const category = categorizeScreenshot(item.ocrText, item.tags);

      await Screenshot.findOneAndUpdate(
        { publicId: item.publicId },
        {
          ...item,
          category,
          fileHash,
        },
        { upsert: true, new: true }
      );

      console.log(`  ✓ Seeded [${category}]: ${item.publicId}`);
    }

    const count = await Screenshot.countDocuments();
    console.log(`\n🎉 Seeding finished successfully! Total screenshots in library: ${count}`);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await closeDB();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
