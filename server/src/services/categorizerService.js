/**
 * Auto-categorizes screenshot content into one of:
 * 'Payments', 'Chats', 'Study', 'Code', 'Tickets', 'Other'
 * using keyword matching and frequency scoring on OCR text and tags.
 */

const CATEGORY_RULES = {
  Payments: [
    /\b(invoice|receipt|payment|paid|subtotal|total|amount|billing|balance|checkout)\b/i,
    /\b(transaction|order\s*id|reference\s*id|upi|gpay|phonepe|paytm|paypal|stripe|razorpay)\b/i,
    /\b(credit\s*card|debit\s*card|mastercard|visa|amex|bank\s*transfer|account\s*number)\b/i,
    /\b(gst|tax|vat|discount|shipping|refund|merchant|payable)\b/i,
    /[\$€£₹¥]\s*\d+([.,]\d{2})?/i,
  ],
  Chats: [
    /\b(whatsapp|telegram|signal|discord|slack|imessage|messenger|wechat)\b/i,
    /\b(typing\b|unread\s*messages?|last\s*seen|online\s*now|replying\s*to)\b/i,
    /\b(direct\s*message|group\s*chat|voice\s*call|video\s*call)\b/i,
    /\b(delivered|sent|seen|today\s+at\s+\d{1,2}:\d{2}|yesterday\s+at\s+\d{1,2}:\d{2})\b/i,
    /\b(chat|dm|conversation|sms|inbox)\b/i,
  ],
  Study: [
    /\b(lecture|syllabus|homework|assignment|quiz|exam|midterm|finals|semester)\b/i,
    /\b(textbook|chapter|coursework|curriculum|professor|instructor|university|college)\b/i,
    /\b(theorem|definition|hypothesis|proof|derivative|integral|equation|formula)\b/i,
    /\b(physics|chemistry|biology|calculus|algebra|geometry|history|literature|psychology)\b/i,
    /\b(research\s*paper|abstract|bibliography|dissertation|thesis|study\s*guide)\b/i,
  ],
  Code: [
    /\b(function|const|let|var|return|import|export|class|def|async|await)\b/i,
    /\b(console\.log|print\(|stdout|stderr|stack\s*trace|syntaxerror|typeerror|uncaught)\b/i,
    /\b(github|gitlab|bitbucket|pull\s*request|commit|branch|repository|merge)\b/i,
    /\b(npm|yarn|pnpm|pip|cargo|docker|dockerfile|kubernetes|terminal|bash|powershell)\b/i,
    /\b(javascript|typescript|python|golang|rust|react|node\.js|html|css|json|sql|mongodb)\b/i,
    /[{}[\]()<>;=>]{3,}/, // Code-like structural symbols
  ],
  Tickets: [
    /\b(boarding\s*pass|flight|airline|departure|arrival|gate\s*\d+|seat\s*\d+[a-z]?)\b/i,
    /\b(pnr|e-ticket|ticket|booking\s*reference|train|railway|coach\s*\w+|berth)\b/i,
    /\b(cinema|movie|showtime|screen\s*\d+|imax|theatre|theater|popcorn)\b/i,
    /\b(concert|festival|tour|stadium|arena|venue|admit\s*one|general\s*admission)\b/i,
    /\b(reservation|itinerary|check-in|passenger|traveler)\b/i,
  ],
};

/**
 * Predicts the category of a screenshot given its OCR text and tags.
 * @param {string} ocrText - Full text extracted via OCR
 * @param {string[]} tags - Cloudinary / AI tags
 * @returns {'Payments' | 'Chats' | 'Study' | 'Code' | 'Tickets' | 'Other'}
 */
function categorizeScreenshot(ocrText = '', tags = []) {
  const combinedText = `${ocrText || ''} ${(tags || []).join(' ')}`.toLowerCase();

  if (!combinedText.trim()) {
    return 'Other';
  }

  const scores = {
    Payments: 0,
    Chats: 0,
    Study: 0,
    Code: 0,
    Tickets: 0,
  };

  for (const [category, patterns] of Object.entries(CATEGORY_RULES)) {
    for (const pattern of patterns) {
      const matches = combinedText.match(new RegExp(pattern, 'gi'));
      if (matches) {
        scores[category] += matches.length;
      }
    }
  }

  // Also check tags specifically (weighted slightly higher)
  const tagString = (tags || []).join(' ').toLowerCase();
  for (const [category, patterns] of Object.entries(CATEGORY_RULES)) {
    for (const pattern of patterns) {
      if (pattern.test(tagString)) {
        scores[category] += 2;
      }
    }
  }

  let highestScore = 0;
  let bestCategory = 'Other';

  for (const [category, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      bestCategory = category;
    }
  }

  return highestScore > 0 ? bestCategory : 'Other';
}

module.exports = {
  categorizeScreenshot,
  CATEGORY_RULES,
};
