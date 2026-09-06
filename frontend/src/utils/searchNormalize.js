// ISSUE 3 FIX — shared search-query normalizer.
//
// Voice search (Web Speech API) frequently appends trailing punctuation to
// recognized phrases, e.g. "mouse" -> "mouse.". Used raw, that broke product
// search entirely ("mouse." never matches a product titled "Mouse").
//
// This normalizer strips only harmless LEADING/TRAILING punctuation and
// collapses stray whitespace — it deliberately leaves punctuation in the
// MIDDLE of a term untouched, so legitimate product names like
// "3-in-1 charger" keep working. Case is left as-is (the existing product
// filter already lowercases both sides when comparing); this only fixes the
// stray-punctuation mismatch.
//
// Mirrors normalize() in backend/routes/reminders.py so a reminder created
// from a voice search ("tomato.") and a typed search ("tomato") always key
// to the same term.
export function normalizeSearchQuery(term) {
  if (!term) return '';
  const cleaned = term
    .trim()
    .replace(/^[.,!?;:'"\u2018\u2019\u201c\u201d]+|[.,!?;:'"\u2018\u2019\u201c\u201d]+$/g, '');
  return cleaned.trim().replace(/\s+/g, ' ');
}
