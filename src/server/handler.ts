/**
 * x-files.js Server Handler
 *
 * WebSocket-based file browser handler for Node.js servers.
 * Manages file system operations with security controls.
 *
 * @example
 * ```typescript
 * import { XFilesHandler } from 'x-files.js';
 * import { WebSocketServer } from 'ws';
 *
 * const handler = new XFilesHandler({
 *   allowedPaths: ['/home/user/projects'],
 *   allowWrite: true,
 *   allowDelete: false,
 * });
 *
 * const wss = new WebSocketServer({ port: 8080 });
 * wss.on('connection', (ws, req) => handler.handleConnection(ws, req));
 * ```
 */

import { WebSocket } from 'ws';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { FileEntry, ServerConfig, ClientMessage } from '../shared/types.js';

/**
 * Configuration options for XFilesHandler
 */
export interface XFilesConfig {
  /**
   * Allowed root paths (directories users can access)
   * Users can only access files within these directories.
   * @default [os.homedir()]
   */
  allowedPaths?: string[];

  /**
   * Allow file write operations (create, edit)
   * @default false
   */
  allowWrite?: boolean;

  /**
   * Allow file/directory deletion
   * @default false
   */
  allowDelete?: boolean;

  /**
   * Maximum file size for read/write operations (bytes)
   * @default 10MB (10 * 1024 * 1024)
   */
  maxFileSize?: number;

  /**
   * Custom authentication function.
   * Called for each new WebSocket connection.
   * Return true to allow, false to deny.
   * @default () => true
   */
  authenticate?: (req: any) => boolean | Promise<boolean>;

  /**
   * Custom authorization function for each operation.
   * Called before executing any file operation.
   * Return true to allow, false to deny.
   */
  authorize?: (operation: string, path: string, req: any) => boolean | Promise<boolean>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<XFilesConfig, 'authorize'>> & { authorize?: XFilesConfig['authorize'] } = {
  allowedPaths: [os.homedir()],
  allowWrite: false,
  allowDelete: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  authenticate: () => true,
  authorize: undefined,
};

/**
 * x-files.js WebSocket Handler
 *
 * Handles WebSocket connections and file system operations
 * with built-in security controls.
 */
export class XFilesHandler {
  private config: Required<Omit<XFilesConfig, 'authorize'>> & { authorize?: XFilesConfig['authorize'] };
  private connections = new Map<WebSocket, { req: any }>();

  constructor(config: XFilesConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Get the server configuration (for client)
   */
  getServerConfig(): ServerConfig {
    return {
      allowedPaths: this.config.allowedPaths,
      allowWrite: this.config.allowWrite,
      allowDelete: this.config.allowDelete,
      maxFileSize: this.config.maxFileSize,
    };
  }

  /**
   * Validate that a path is within allowed directories
   */
  private isPathAllowed(targetPath: string): boolean {
    const normalizedTarget = path.normalize(path.resolve(targetPath));
    return this.config.allowedPaths.some((allowedPath) => {
      const normalizedAllowed = path.normalize(path.resolve(allowedPath));
      return normalizedTarget.startsWith(normalizedAllowed);
    });
  }

  /**
   * Sanitize path to prevent directory traversal attacks
   */
  private sanitizePath(inputPath: string): string {
    // Remove null bytes and normalize
    return path.normalize(inputPath.replace(/\0/g, ''));
  }

  /**
   * Validate and resolve path, throwing if not allowed
   */
  private validatePath(inputPath: string): string {
    const sanitized = this.sanitizePath(inputPath);
    const resolved = path.resolve(sanitized);

    if (!this.isPathAllowed(resolved)) {
      throw new Error(`Access denied: ${inputPath}`);
    }

    return resolved;
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws: WebSocket, req: any): Promise<void> {
    // Authenticate
    try {
      const authenticated = await this.config.authenticate(req);
      if (!authenticated) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Authentication failed'
        }));
        ws.close(4001, 'Authentication failed');
        return;
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Authentication error'
      }));
      ws.close(4001, 'Authentication error');
      return;
    }

    // Store connection
    this.connections.set(ws, { req });

    // Send server config
    ws.send(JSON.stringify({
      type: 'connected',
      config: this.getServerConfig()
    }));

    // Handle messages
    ws.on('message', async (data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        await this.handleMessage(ws, message, req);
      } catch (error) {
        console.error('[x-files] Error handling message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: (error as Error).message
        }));
      }
    });

    // Handle close
    ws.on('close', () => {
      this.connections.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('[x-files] WebSocket error:', error);
      this.connections.delete(ws);
    });
  }

  /**
   * Handle client message
   */
  private async handleMessage(ws: WebSocket, message: ClientMessage, req: any): Promise<void> {
    const { type, requestId, ...params } = message;

    // Check authorization if configured
    if (this.config.authorize) {
      const targetPath = params.path || params.oldPath || params.source || '';
      const authorized = await this.config.authorize(type, targetPath, req);
      if (!authorized) {
        ws.send(JSON.stringify({
          type: 'result',
          requestId,
          success: false,
          error: 'Operation not authorized'
        }));
        return;
      }
    }

    try {
      let result: any;

      switch (type) {
        case 'list':
          result = await this.listDirectory(params.path);
          break;

        case 'stat':
          result = await this.getStats(params.path);
          break;

        case 'read':
          result = await this.readFile(params.path, params.encoding);
          break;

        case 'write':
          this.checkWritePermission();
          result = await this.writeFile(params.path, params.content, params.encoding);
          break;

        case 'mkdir':
          this.checkWritePermission();
          result = await this.createDirectory(params.path);
          break;

        case 'delete':
          this.checkDeletePermission();
          result = await this.deleteItem(params.path);
          break;

        case 'rename':
          this.checkWritePermission();
          result = await this.renameItem(params.oldPath, params.newPath);
          break;

        case 'copy':
          this.checkWritePermission();
          result = await this.copyItem(params.source, params.destination);
          break;

        case 'exists':
          result = await this.exists(params.path);
          break;

        case 'search':
          result = await this.searchFiles(params.path, params.pattern, params.options);
          break;

        default:
          throw new Error(`Unknown operation: ${type}`);
      }

      ws.send(JSON.stringify({
        type: 'result',
        requestId,
        success: true,
        data: result
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'result',
        requestId,
        success: false,
        error: (error as Error).message
      }));
    }
  }

  private checkWritePermission(): void {
    if (!this.config.allowWrite) {
      throw new Error('Write operations are not allowed');
    }
  }

  private checkDeletePermission(): void {
    if (!this.config.allowDelete) {
      throw new Error('Delete operations are not allowed');
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath: string): Promise<FileEntry[]> {
    const resolvedPath = this.validatePath(dirPath);
    const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
    const results: FileEntry[] = [];

    for (const entry of entries) {
      try {
        const entryPath = path.join(resolvedPath, entry.name);
        const stats = await fs.stat(entryPath);

        results.push({
          name: entry.name,
          path: entryPath,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
          size: stats.size,
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString(),
        });
      } catch {
        // Skip entries we can't access
      }
    }

    // Sort: directories first, then alphabetically
    results.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return results;
  }

  /**
   * Get file/directory stats
   */
  async getStats(filePath: string): Promise<FileEntry> {
    const resolvedPath = this.validatePath(filePath);
    const stats = await fs.stat(resolvedPath);

    return {
      name: path.basename(resolvedPath),
      path: resolvedPath,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      size: stats.size,
      modified: stats.mtime.toISOString(),
      created: stats.birthtime.toISOString(),
    };
  }

  /**
   * Read file contents
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<{ content: string; size: number }> {
    const resolvedPath = this.validatePath(filePath);
    const stats = await fs.stat(resolvedPath);

    if (stats.size > this.config.maxFileSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxFileSize})`);
    }

    const content = await fs.readFile(resolvedPath, { encoding });
    return { content, size: stats.size };
  }

  /**
   * Write file contents
   */
  async writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<{ path: string; size: number }> {
    const resolvedPath = this.validatePath(filePath);
    const contentSize = Buffer.byteLength(content, encoding);

    if (contentSize > this.config.maxFileSize) {
      throw new Error(`Content too large: ${contentSize} bytes (max: ${this.config.maxFileSize})`);
    }

    await fs.writeFile(resolvedPath, content, { encoding });
    const stats = await fs.stat(resolvedPath);

    return { path: resolvedPath, size: stats.size };
  }

  /**
   * Create directory
   */
  async createDirectory(dirPath: string): Promise<{ path: string }> {
    const resolvedPath = this.validatePath(dirPath);
    await fs.mkdir(resolvedPath, { recursive: true });
    return { path: resolvedPath };
  }

  /**
   * Delete file or directory
   */
  async deleteItem(itemPath: string): Promise<{ deleted: string }> {
    const resolvedPath = this.validatePath(itemPath);
    const stats = await fs.stat(resolvedPath);

    if (stats.isDirectory()) {
      await fs.rm(resolvedPath, { recursive: true });
    } else {
      await fs.unlink(resolvedPath);
    }

    return { deleted: resolvedPath };
  }

  /**
   * Rename/move file or directory
   */
  async renameItem(oldPath: string, newPath: string): Promise<{ oldPath: string; newPath: string }> {
    const resolvedOld = this.validatePath(oldPath);
    const resolvedNew = this.validatePath(newPath);
    await fs.rename(resolvedOld, resolvedNew);
    return { oldPath: resolvedOld, newPath: resolvedNew };
  }

  /**
   * Copy file or directory
   */
  async copyItem(source: string, destination: string): Promise<{ source: string; destination: string }> {
    const resolvedSource = this.validatePath(source);
    const resolvedDest = this.validatePath(destination);
    const stats = await fs.stat(resolvedSource);

    if (stats.isDirectory()) {
      await this.copyDirectoryRecursive(resolvedSource, resolvedDest);
    } else {
      await fs.copyFile(resolvedSource, resolvedDest);
    }

    return { source: resolvedSource, destination: resolvedDest };
  }

  private async copyDirectoryRecursive(source: string, destination: string): Promise<void> {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Check if path exists
   */
  async exists(itemPath: string): Promise<{ exists: boolean; isDirectory?: boolean; isFile?: boolean }> {
    try {
      const resolvedPath = this.validatePath(itemPath);
      const stats = await fs.stat(resolvedPath);
      return {
        exists: true,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Search for files matching pattern
   */
  async searchFiles(
    dirPath: string,
    pattern: string,
    options: { recursive?: boolean; maxResults?: number } = {}
  ): Promise<FileEntry[]> {
    const resolvedPath = this.validatePath(dirPath);
    const { recursive = true, maxResults = 100 } = options;
    const results: FileEntry[] = [];
    const regex = new RegExp(pattern, 'i');

    await this.searchDirectoryRecursive(resolvedPath, regex, results, recursive, maxResults);
    return results;
  }

  private async searchDirectoryRecursive(
    dirPath: string,
    pattern: RegExp,
    results: FileEntry[],
    recursive: boolean,
    maxResults: number
  ): Promise<void> {
    if (results.length >= maxResults) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        const entryPath = path.join(dirPath, entry.name);

        if (pattern.test(entry.name)) {
          try {
            const stats = await fs.stat(entryPath);
            results.push({
              name: entry.name,
              path: entryPath,
              isDirectory: entry.isDirectory(),
              isFile: entry.isFile(),
              size: stats.size,
              modified: stats.mtime.toISOString(),
              created: stats.birthtime.toISOString(),
            });
          } catch {
            // Skip inaccessible
          }
        }

        if (recursive && entry.isDirectory()) {
          await this.searchDirectoryRecursive(entryPath, pattern, results, recursive, maxResults);
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  /**
   * Get number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    for (const ws of this.connections.keys()) {
      ws.close(1000, 'Server closing');
    }
    this.connections.clear();
  }
}
