// lib/swr.ts — barrel preserving backward compat after the 2099-line split.
// Prefer importing from specific domain modules (lib/swr/projects, lib/swr/messaging, etc.)
// in new code. This barrel exists so existing consumers don't break.
export * from './swr/config';
export * from './swr/cache-keys';
export * from './swr/projects';
export * from './swr/profiles';
export * from './swr/meetings';
export * from './swr/notifications';
export * from './swr/ai';
export * from './swr/portal';
export * from './swr/messaging';
export * from './swr/sessions';
export * from './swr/admin';
export * from './swr/comments';
