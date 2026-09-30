// A scanned code: 6+ letters/digits/dashes with at least one digit, so plain
// words like "futbolka" stay a text search.
export const isBarcode = (s) => /^[A-Za-z0-9-]{6,}$/.test(s) && /\d/.test(s);
