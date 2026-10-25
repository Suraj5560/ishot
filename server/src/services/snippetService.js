/**
 * Generates an excerpt snippet centered around the query terms from the OCR text,
 * caption, or tags of a screenshot document.
 */

function generateSnippet(doc, query = '', maxChars = 140) {
  const ocrText = (doc.ocrText || '').trim();
  const caption = (doc.caption || '').trim();
  const tags = Array.isArray(doc.tags) ? doc.tags : [];

  if (!query || !query.trim()) {
    if (ocrText) {
      return truncateCleanly(ocrText, maxChars);
    }
    if (caption) {
      return caption;
    }
    if (tags.length > 0) {
      return `Tags: ${tags.slice(0, 5).join(', ')}`;
    }
    return 'No text extracted';
  }

  const cleanQuery = query.trim().toLowerCase();
  const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);

  // Check ocrText first
  if (ocrText) {
    const ocrLower = ocrText.toLowerCase();

    // Find the earliest match for full query or any term
    let bestIndex = ocrLower.indexOf(cleanQuery);
    let matchedLength = cleanQuery.length;

    if (bestIndex === -1) {
      for (const term of queryTerms) {
        const idx = ocrLower.indexOf(term);
        if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
          bestIndex = idx;
          matchedLength = term.length;
        }
      }
    }

    if (bestIndex !== -1) {
      const halfWindow = Math.floor((maxChars - matchedLength) / 2);
      let start = Math.max(0, bestIndex - halfWindow);
      let end = Math.min(ocrText.length, bestIndex + matchedLength + halfWindow);

      // Adjust to word boundaries if possible
      if (start > 0) {
        const spaceBefore = ocrText.indexOf(' ', start);
        if (spaceBefore !== -1 && spaceBefore < bestIndex) {
          start = spaceBefore + 1;
        }
      }
      if (end < ocrText.length) {
        const spaceAfter = ocrText.lastIndexOf(' ', end);
        if (spaceAfter !== -1 && spaceAfter > bestIndex + matchedLength) {
          end = spaceAfter;
        }
      }

      let snippet = ocrText.slice(start, end).trim();
      if (start > 0) snippet = '...' + snippet;
      if (end < ocrText.length) snippet = snippet + '...';

      return snippet;
    }
  }

  // Check caption
  if (caption) {
    const captionLower = caption.toLowerCase();
    for (const term of queryTerms) {
      if (captionLower.includes(term)) {
        return caption;
      }
    }
  }

  // Check tags
  const matchedTags = tags.filter((t) =>
    queryTerms.some((term) => t.toLowerCase().includes(term))
  );
  if (matchedTags.length > 0) {
    return `Tags matched: ${matchedTags.join(', ')}`;
  }

  // Fallback to text start or caption
  if (ocrText) {
    return truncateCleanly(ocrText, maxChars);
  }
  if (caption) {
    return caption;
  }
  return 'No text extracted';
}

function truncateCleanly(str, max) {
  if (!str || str.length <= max) return str;
  const cut = str.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const clean = lastSpace > 30 ? cut.slice(0, lastSpace) : cut;
  return clean + '...';
}

module.exports = {
  generateSnippet,
};
