# x-files.js

<div align="left">

```
    __  __      ______ _ _                _
    \ \/ /     |  ____(_) |              (_)
     \  /______| |__   _| | ___  ___      _ ___
     /  \______|  __| | | |/ _ \/ __|    | / __|
    /_/\_\     | |    | | |  __/\__ \  _ | \__ \
               |_|    |_|_|\___||___/ (_)| |___/
                                        _/ |
                                       |__/
```

**The truth is in your file system** 👽

[![npm version](https://img.shields.io/npm/v/x-files.js.svg)](https://www.npmjs.com/package/x-files.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Installation](#installation) • [Quick Start](#quick-start) • [API](#api) • [Security](#security) • [Examples](#examples)

</div>

---

WebSocket-based file browser for Node.js. Browse, read, write, and manage remote files through a simple, secure API.

## Why x-files.js?

- **WebSocket-based** - Real-time, bidirectional communication
- **Security-first** - Path whitelisting, auth hooks, granular permissions
- **Lightweight** - ~10KB client bundle, minimal dependencies
- **TypeScript** - Full type definitions included
- **Universal** - Works in browsers and Node.js

## Installation

```bash
npm install x-files.js
```

## Quick Start

### Server

```typescript
import { XFilesHandler } from 'x-files.js';
import { WebSocketServer } from 'ws';

const handler = new XFilesHandler({
  allowedPaths: ['/home/user/projects'],
  allowWrite: true,
});

const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws, req) => handler.handleConnection(ws, req));

console.log('x-files server running on ws://localhost:8080');
```

### Client (Browser)

```javascript
import { XFilesClient } from 'x-files.js/client/browser';

const client = new XFilesClient({ url: 'ws://localhost:8080' });
await client.connect();

// List files
const files = await client.listDirectory('/home/user/projects');

// Read a file
const { content } = await client.readFile('/home/user/projects/README.md');

// Write a file
await client.writeFile('/home/user/projects/hello.txt', 'Hello, World!');
```

### Client (Node.js)

```typescript
import { XFilesClient } from 'x-files.js/client';

const client = new XFilesClient({ url: 'ws://localhost:8080' });
await client.connect();

const files = await client.listDirectory('/home/user');
```

## API

### Server Configuration

```typescript
const handler = new XFilesHandler({
  // Directories users can access (required for security)
  allowedPaths: ['/data', '/uploads'],  // Default: [os.homedir()]

  // Permissions
  allowWrite: false,   // Allow create/edit operations
  allowDelete: false,  // Allow delete operations

  // Limits
  maxFileSize: 10 * 1024 * 1024,  // 10MB default

  // Authentication (called on each connection)
  authenticate: async (req) => {
    const token = req.headers.authorization;
    return await validateToken(token);
  },

  // Authorization (called on each operation)
  authorize: async (operation, path, req) => {
    // Fine-grained per-operation control
    return true;
  },
});
```

### Client Methods

| Method | Description |
|--------|-------------|
| `connect()` | Connect to server |
| `disconnect()` | Disconnect from server |
| `isConnected()` | Check connection status |
| `getServerConfig()` | Get server configuration |

### File Operations

| Method | Description | Requires |
|--------|-------------|----------|
| `listDirectory(path)` | List directory contents | - |
| `getStats(path)` | Get file/directory info | - |
| `readFile(path, encoding?)` | Read file contents | - |
| `writeFile(path, content, encoding?)` | Write file | `allowWrite` |
| `createDirectory(path)` | Create directory | `allowWrite` |
| `deleteItem(path)` | Delete file/directory | `allowDelete` |
| `rename(oldPath, newPath)` | Rename/move | `allowWrite` |
| `copy(source, destination)` | Copy file/directory | `allowWrite` |
| `exists(path)` | Check if path exists | - |
| `search(path, pattern, options?)` | Search for files | - |

### FileEntry Type

```typescript
interface FileEntry {
  name: string;        // File name
  path: string;        // Full path
  isDirectory: boolean;
  isFile: boolean;
  size: number;        // Size in bytes
  modified: string;    // ISO date string
  created: string;     // ISO date string
}
```

### Events

```typescript
client.onConnect(() => console.log('Connected!'));
client.onDisconnect(() => console.log('Disconnected'));
client.onError((err) => console.error('Error:', err));
```

## Security

x-files.js is designed with security as a priority:

| Feature | Description |
|---------|-------------|
| **Path Whitelisting** | Only explicitly allowed directories are accessible |
| **Traversal Protection** | Paths are normalized and validated |
| **Read-Only Default** | Write/delete must be explicitly enabled |
| **Authentication Hook** | Custom auth logic per connection |
| **Authorization Hook** | Per-operation permission checks |
| **Size Limits** | Configurable max file size |

### Example: Secure Setup

```typescript
const handler = new XFilesHandler({
  // 1. Whitelist specific directories only
  allowedPaths: ['/app/user-data'],

  // 2. Enable only what's needed
  allowWrite: true,
  allowDelete: false,

  // 3. Limit file sizes
  maxFileSize: 5 * 1024 * 1024,  // 5MB

  // 4. Authenticate connections
  authenticate: async (req) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return false;
    return await verifyJWT(token);
  },

  // 5. Authorize operations
  authorize: async (operation, path, req) => {
    const user = req.user;
    // Users can only access their own directory
    return path.startsWith(`/app/user-data/${user.id}/`);
  },
});
```

## Examples

### With Express

```typescript
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { XFilesHandler } from 'x-files.js';

const app = express();
const server = createServer(app);

// Mount on /files path
const wss = new WebSocketServer({ server, path: '/files' });

const handler = new XFilesHandler({
  allowedPaths: ['/data'],
  allowWrite: true,
});

wss.on('connection', (ws, req) => handler.handleConnection(ws, req));

server.listen(3000);
```

### File Browser UI

```html
<div id="file-list"></div>

<script type="module">
import { XFilesClient } from 'https://unpkg.com/x-files.js/dist/client/browser-bundle.js';

const client = new XFilesClient({ url: 'ws://localhost:8080' });
await client.connect();

const files = await client.listDirectory('/data');
document.getElementById('file-list').innerHTML = files
  .map(f => `<div>${f.isDirectory ? '[DIR]' : '[FILE]'} ${f.name}</div>`)
  .join('');
</script>
```

## Use Cases

- **Web IDEs** - Browse and edit remote code
- **Admin Panels** - Manage server files
- **File Managers** - Build custom file browsers
- **Dev Tools** - Remote development environments
- **Media Browsers** - Browse remote media libraries

## Related Projects

- [xterm.js](https://github.com/xtermjs/xterm.js) - Terminal for the browser
- [electron-to-web](https://github.com/lsadehaan/electron-to-web) - Run Electron apps in the browser

## License

MIT
