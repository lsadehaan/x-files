# x-files.js

> The truth is in your file system 👽

WebSocket-based file browser for Node.js. Browse, read, write, and manage files on a remote server through a simple, secure API.

## Features

- **WebSocket-based** - Real-time, bidirectional communication
- **Security-first** - Path whitelisting, authentication hooks, granular permissions
- **Lightweight** - No heavy dependencies, ~10KB client bundle
- **TypeScript** - Full type definitions included
- **Universal client** - Works in browsers and Node.js

## Installation

```bash
npm install x-files.js
```

## Quick Start

### Server

```typescript
import { XFilesHandler } from 'x-files.js';
import { WebSocketServer } from 'ws';

// Create handler with security config
const handler = new XFilesHandler({
  allowedPaths: ['/home/user/projects', '/var/data'],
  allowWrite: true,
  allowDelete: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
});

// Attach to WebSocket server
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws, req) => handler.handleConnection(ws, req));

console.log('x-files server running on ws://localhost:8080');
```

### Client (Browser)

```html
<script type="module">
  import { XFilesClient } from 'x-files.js/client/browser';

  const client = new XFilesClient({ url: 'ws://localhost:8080' });

  client.onConnect(() => {
    console.log('Connected!', client.getServerConfig());
  });

  await client.connect();

  // List files
  const files = await client.listDirectory('/home/user/projects');
  console.log(files);

  // Read file
  const { content } = await client.readFile('/home/user/projects/README.md');
  console.log(content);
</script>
```

### Client (Node.js)

```typescript
import { XFilesClient } from 'x-files.js/client';

const client = new XFilesClient({ url: 'ws://localhost:8080' });
await client.connect();

const files = await client.listDirectory('/home/user');
```

## Server Configuration

```typescript
interface XFilesConfig {
  // Paths users can access (required for security)
  allowedPaths?: string[];  // Default: [os.homedir()]

  // Permission flags
  allowWrite?: boolean;     // Default: false
  allowDelete?: boolean;    // Default: false

  // Limits
  maxFileSize?: number;     // Default: 10MB

  // Authentication hook
  authenticate?: (req: any) => boolean | Promise<boolean>;

  // Per-operation authorization
  authorize?: (operation: string, path: string, req: any) => boolean | Promise<boolean>;
}
```

### With Express

```typescript
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { XFilesHandler } from 'x-files.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/files' });

const handler = new XFilesHandler({
  allowedPaths: ['/data'],
  allowWrite: true,
  authenticate: (req) => {
    // Check auth header, session, etc.
    return req.headers.authorization === 'Bearer secret';
  },
});

wss.on('connection', (ws, req) => handler.handleConnection(ws, req));

server.listen(3000);
```

## Client API

### Connection

```typescript
const client = new XFilesClient({
  url: 'ws://localhost:8080',
  autoReconnect: true,        // Default: true
  maxReconnectAttempts: 5,    // Default: 5
  reconnectDelay: 1000,       // Default: 1000ms
  maxReconnectDelay: 30000,   // Default: 30000ms
});

// Event handlers
client.onConnect(() => console.log('Connected'));
client.onDisconnect(() => console.log('Disconnected'));
client.onError((err) => console.error(err));

// Connect
await client.connect();

// Check status
client.isConnected();         // boolean
client.getServerConfig();     // ServerConfig | null

// Disconnect
client.disconnect();
```

### File Operations

```typescript
// List directory
const files = await client.listDirectory('/path/to/dir');
// Returns: FileEntry[]

// Get file/directory info
const stats = await client.getStats('/path/to/file');
// Returns: FileEntry

// Read file
const { content, size } = await client.readFile('/path/to/file', 'utf-8');

// Write file (requires allowWrite)
await client.writeFile('/path/to/file', 'content', 'utf-8');

// Create directory (requires allowWrite)
await client.createDirectory('/path/to/new/dir');

// Delete file/directory (requires allowDelete)
await client.deleteItem('/path/to/delete');

// Rename/move (requires allowWrite)
await client.rename('/old/path', '/new/path');

// Copy (requires allowWrite)
await client.copy('/source', '/destination');

// Check existence
const { exists, isFile, isDirectory } = await client.exists('/path');

// Search files
const matches = await client.search('/dir', 'pattern', {
  recursive: true,
  maxResults: 100,
});
```

### FileEntry Type

```typescript
interface FileEntry {
  name: string;        // File name
  path: string;        // Full path
  isDirectory: boolean;
  isFile: boolean;
  size: number;        // Bytes
  modified: string;    // ISO date
  created: string;     // ISO date
}
```

## Security

x-files.js is designed with security in mind:

1. **Path Whitelisting** - Only explicitly allowed paths are accessible
2. **No Traversal** - Paths are normalized and validated
3. **Permissions** - Read-only by default, write/delete must be explicitly enabled
4. **Authentication** - Hook for custom auth logic
5. **Authorization** - Per-operation permission checks
6. **Size Limits** - Configurable max file size

### Security Best Practices

```typescript
const handler = new XFilesHandler({
  // 1. Whitelist specific directories
  allowedPaths: ['/app/data', '/app/uploads'],

  // 2. Be conservative with permissions
  allowWrite: true,
  allowDelete: false,  // Usually safer to disable

  // 3. Limit file sizes
  maxFileSize: 5 * 1024 * 1024,  // 5MB

  // 4. Implement authentication
  authenticate: async (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    return await validateToken(token);
  },

  // 5. Fine-grained authorization
  authorize: async (operation, path, req) => {
    // Example: Only allow writes to user's own directory
    const user = await getUserFromRequest(req);
    if (operation === 'write' || operation === 'delete') {
      return path.startsWith(`/data/users/${user.id}/`);
    }
    return true;
  },
});
```

## Use Cases

- **Web IDEs** - Browse and edit code files
- **Admin Panels** - Manage server files
- **File Managers** - Build custom file browsers
- **Remote Development** - Access files on remote servers
- **Electron Apps** - Server-side file operations for web views

## Comparison

| Feature | x-files.js | FileBrowser | Other |
|---------|-----------|-------------|-------|
| Protocol | WebSocket | HTTP REST | Varies |
| Language | TypeScript | Go | - |
| Embeddable | Yes | Separate process | - |
| Bundle Size | ~10KB | N/A | - |
| Auth Hook | Yes | Config file | - |

## License

MIT
