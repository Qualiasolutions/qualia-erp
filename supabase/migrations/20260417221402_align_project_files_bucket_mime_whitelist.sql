-- Align the project-files bucket MIME whitelist with the code-level whitelist
-- in app/actions/project-files.ts. Previously text/html was allowed in code but
-- NOT in the bucket, causing POST 400 from storage on .html uploads. This also
-- adds commonly-missing types: image/heic (iPhone), image/svg+xml, image/avif,
-- application/octet-stream (browser fallback), video/webm, audio/ogg,
-- application/x-zip-compressed.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/heic',
  'image/heif',
  -- Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  -- Text
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  -- Archives / data
  'application/json',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-zip-compressed',
  'application/octet-stream',
  -- Media
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg'
]
WHERE id = 'project-files';
