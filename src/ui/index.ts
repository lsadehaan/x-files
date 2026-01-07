/**
 * x-files.js UI components
 *
 * Web Components for file browsing, built with Lit.
 * Works with any framework (React, Vue, Angular, Svelte, vanilla JS).
 */

export { XFilesBrowser } from './x-files-browser.js';
export { XFilesIcon } from './x-files-icon.js';
export { XFilesBreadcrumb } from './x-files-breadcrumb.js';

// Re-export client for convenience
export { XFilesClient } from '../client/client.js';
export type { XFilesClientConfig } from '../client/client.js';
export type { FileEntry, ServerConfig } from '../shared/types.js';
