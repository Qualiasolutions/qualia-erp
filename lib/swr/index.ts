// lib/swr/index.ts — barrel preserving backward compat after the 2099-line split.
// Prefer importing from specific domain modules (lib/swr/projects, lib/swr/messaging, etc.)
// in new code. This barrel exists so existing consumers don't break.
export * from './config';
export * from './cache-keys';
export * from './projects';
export * from './profiles';
export * from './meetings';
export * from './notifications';
export * from './ai';
export * from './portal';
export * from './messaging';
export * from './sessions';
export * from './admin';
export * from './comments';
