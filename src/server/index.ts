/**
 * x-files.js - Server exports
 *
 * WebSocket-based file browser for Node.js
 */

export { XFilesHandler } from './handler.js';
export type { XFilesConfig } from './handler.js';
export type { FileEntry, ServerConfig, MessageType, ClientMessage, ServerMessage } from '../shared/types.js';
