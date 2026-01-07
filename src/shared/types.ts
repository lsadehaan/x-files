/**
 * Shared types for x-files.js
 */

/**
 * File/directory entry
 */
export interface FileEntry {
  /** File or directory name */
  name: string;
  /** Full path on server */
  path: string;
  /** True if this is a directory */
  isDirectory: boolean;
  /** True if this is a file */
  isFile: boolean;
  /** Size in bytes (0 for directories) */
  size: number;
  /** Last modified date (ISO string) */
  modified: string;
  /** Creation date (ISO string) */
  created: string;
  /** File permissions (optional) */
  permissions?: string;
}

/**
 * Server configuration sent to client on connect
 */
export interface ServerConfig {
  /** Paths the client is allowed to access */
  allowedPaths: string[];
  /** Whether write operations are allowed */
  allowWrite: boolean;
  /** Whether delete operations are allowed */
  allowDelete: boolean;
  /** Maximum file size for read/write (bytes) */
  maxFileSize: number;
}

/**
 * Message types for WebSocket communication
 */
export type MessageType =
  | 'list'
  | 'stat'
  | 'read'
  | 'write'
  | 'mkdir'
  | 'delete'
  | 'rename'
  | 'copy'
  | 'exists'
  | 'search';

/**
 * Client request message
 */
export interface ClientMessage {
  type: MessageType;
  requestId: number;
  [key: string]: any;
}

/**
 * Server response message
 */
export interface ServerMessage {
  type: 'connected' | 'result' | 'error';
  requestId?: number;
  success?: boolean;
  data?: any;
  error?: string;
  config?: ServerConfig;
}
