import sanitizeHtml from 'sanitize-html';

// Strip ALL HTML tags — we never want any markup in user input
export function stripHtml(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}
