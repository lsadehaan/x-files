/**
 * x-files.js Client
 *
 * WebSocket client for connecting to x-files.js server.
 * Works in both Node.js and browser environments.
 *
 * @example
 * ```typescript
 * import { XFilesClient } from 'x-files.js/client';
 *
 * const client = new XFilesClient({ url: 'ws://localhost:8080' });
 *
 * client.onConnect(() => {
 *   console.log('Connected!', client.getServerConfig());
 * });
 *
 * await client.connect();
 *
 * const files = await client.listDirectory('/home/user');
 * console.log(files);
 * ```
 */

import type { FileEntry, ServerConfig } from '../shared/types.js';

/**
 * Client configuration options
 */
export interface XFilesClientConfig {
  /**
   * WebSocket URL to connect to
   * @example 'ws://localhost:8080'
   * @example 'wss://example.com/files'
   */
  url: string;

  /**
   * Automatically reconnect on disconnect
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Maximum reconnection attempts
   * @default 5
   */
  maxReconnectAttempts?: number;

  /**
   * Reconnection delay in ms (doubles each attempt)
   * @default 1000
   */
  reconnectDelay?: number;

  /**
   * Maximum reconnection delay in ms
   * @default 30000
   */
  maxReconnectDelay?: number;
}

/**
 * x-files.js WebSocket Client
 */
export class XFilesClient {
  private ws: WebSocket | null = null;
  private config: Required<XFilesClientConfig>;
  private connected = false;
  private connecting = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
  private serverConfig: ServerConfig | null = null;

  // Event handlers
  private connectHandler?: () => void;
  private disconnectHandler?: () => void;
  private errorHandler?: (error: Error) => void;

  constructor(config: XFilesClientConfig) {
    this.config = {
      url: config.url,
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
    };
  }

  /**
   * Connect to the server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      if (this.connecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.connecting = true;
      this.ws = new WebSocket(this.config.url);

      const onConnected = () => {
        this.connecting = false;
        resolve();
      };

      const onError = (error: Error) => {
        this.connecting = false;
        reject(error);
      };

      this.ws.onopen = () => {
        console.log('[x-files] Connected');
        this.connected = true;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message, onConnected, onError);
        } catch (error) {
          console.error('[x-files] Error parsing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[x-files] Disconnected');
        const wasConnected = this.connected;
        this.connected = false;
        this.connecting = false;

        // Reject pending requests
        for (const [, { reject }] of this.pendingRequests) {
          reject(new Error('Connection closed'));
        }
        this.pendingRequests.clear();

        if (wasConnected) {
          this.disconnectHandler?.();
        }

        // Auto reconnect
        if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        console.error('[x-files] WebSocket error');
        const error = new Error('WebSocket connection error');
        this.errorHandler?.(error);
        if (!this.connected) {
          onError(error);
        }
      };
    });
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectDelay
    );

    console.log(`[x-files] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.connect().catch(() => {});
    }, delay);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(
    message: any,
    onConnected: () => void,
    onError: (error: Error) => void
  ): void {
    switch (message.type) {
      case 'connected':
        this.serverConfig = message.config;
        this.connectHandler?.();
        onConnected();
        break;

      case 'error':
        if (!this.connected) {
          onError(new Error(message.error));
        } else {
          this.errorHandler?.(new Error(message.error));
        }
        break;

      case 'result':
        const pending = this.pendingRequests.get(message.requestId);
        if (pending) {
          this.pendingRequests.delete(message.requestId);
          if (message.success) {
            pending.resolve(message.data);
          } else {
            pending.reject(new Error(message.error));
          }
        }
        break;
    }
  }

  /**
   * Send request to server
   */
  private request<T>(type: string, params: Record<string, any> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        reject(new Error('Not connected'));
        return;
      }

      const requestId = ++this.requestId;
      this.pendingRequests.set(requestId, { resolve, reject });

      this.ws.send(JSON.stringify({
        type,
        requestId,
        ...params,
      }));
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.config.autoReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connected = false;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get server configuration
   */
  getServerConfig(): ServerConfig | null {
    return this.serverConfig;
  }

  // Event handlers

  /**
   * Called when connected to server
   */
  onConnect(handler: () => void): this {
    this.connectHandler = handler;
    return this;
  }

  /**
   * Called when disconnected from server
   */
  onDisconnect(handler: () => void): this {
    this.disconnectHandler = handler;
    return this;
  }

  /**
   * Called on error
   */
  onError(handler: (error: Error) => void): this {
    this.errorHandler = handler;
    return this;
  }

  // File operations

  /**
   * List directory contents
   * @param path Directory path to list
   * @returns Array of file entries
   */
  async listDirectory(path: string): Promise<FileEntry[]> {
    return this.request<FileEntry[]>('list', { path });
  }

  /**
   * Get file or directory stats
   * @param path Path to get stats for
   * @returns File entry with stats
   */
  async getStats(path: string): Promise<FileEntry> {
    return this.request<FileEntry>('stat', { path });
  }

  /**
   * Read file contents
   * @param path File path to read
   * @param encoding Text encoding (default: 'utf-8')
   * @returns Object with content and size
   */
  async readFile(path: string, encoding: string = 'utf-8'): Promise<{ content: string; size: number }> {
    return this.request('read', { path, encoding });
  }

  /**
   * Write file contents
   * @param path File path to write
   * @param content Content to write
   * @param encoding Text encoding (default: 'utf-8')
   * @returns Object with path and size
   */
  async writeFile(path: string, content: string, encoding: string = 'utf-8'): Promise<{ path: string; size: number }> {
    return this.request('write', { path, content, encoding });
  }

  /**
   * Create directory
   * @param path Directory path to create
   * @returns Object with created path
   */
  async createDirectory(path: string): Promise<{ path: string }> {
    return this.request('mkdir', { path });
  }

  /**
   * Delete file or directory
   * @param path Path to delete
   * @returns Object with deleted path
   */
  async deleteItem(path: string): Promise<{ deleted: string }> {
    return this.request('delete', { path });
  }

  /**
   * Rename or move file/directory
   * @param oldPath Current path
   * @param newPath New path
   * @returns Object with old and new paths
   */
  async rename(oldPath: string, newPath: string): Promise<{ oldPath: string; newPath: string }> {
    return this.request('rename', { oldPath, newPath });
  }

  /**
   * Copy file or directory
   * @param source Source path
   * @param destination Destination path
   * @returns Object with source and destination paths
   */
  async copy(source: string, destination: string): Promise<{ source: string; destination: string }> {
    return this.request('copy', { source, destination });
  }

  /**
   * Check if path exists
   * @param path Path to check
   * @returns Object with exists, isDirectory, isFile
   */
  async exists(path: string): Promise<{ exists: boolean; isDirectory?: boolean; isFile?: boolean }> {
    return this.request('exists', { path });
  }

  /**
   * Search for files matching pattern
   * @param path Directory to search in
   * @param pattern Regex pattern to match file names
   * @param options Search options
   * @returns Array of matching file entries
   */
  async search(
    path: string,
    pattern: string,
    options?: { recursive?: boolean; maxResults?: number }
  ): Promise<FileEntry[]> {
    return this.request<FileEntry[]>('search', { path, pattern, options });
  }
}
