/** Journal photo rules shared by the browser (which uploads) and the server (which verifies). */
export const JOURNAL_BUCKET_NAME = "journal";
export const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export const PHOTO_MAX_MB = 15; // keep in sync with the journal bucket's file_size_limit
export const PHOTO_MAX_BYTES = PHOTO_MAX_MB * 1024 * 1024;
export const PHOTOS_PER_ENTRY = 6;
