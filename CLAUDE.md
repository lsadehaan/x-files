# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**x-files.js** is a WebSocket-based file browser for Node.js. It provides a secure way to browse, read, write, and manage files on a remote server through a simple API.

## Development Commands

```bash
npm run build          # Compile TypeScript + browser bundle
npm run build:browser  # Just browser bundle
npm run watch          # Watch mode for TypeScript
npm run clean          # Remove dist/
```

## Architecture

### Two-Package Design

1. **Server** (`x-files.js` or `x-files.js/server`)
   - `XFilesHandler` - WebSocket handler class
   - Handles all file operations with security controls
   - Path validation, authentication, authorization hooks

2. **Client** (`x-files.js/client`)
   - `XFilesClient` - WebSocket client class
   - Works in Node.js and browsers
   - Browser bundle at `x-files.js/client/browser`

### Source Structure

```
src/
├── server/
│   ├── handler.ts    # Main handler class
│   └── index.ts      # Server exports
├── client/
│   ├── client.ts     # Main client class
│   └── index.ts      # Client exports
└── shared/
    └── types.ts      # Shared TypeScript types
```

### Security Model

- **Path Whitelisting**: Only `allowedPaths` are accessible
- **Permissions**: `allowWrite` and `allowDelete` default to false
- **Authentication**: `authenticate(req)` hook for auth checks
- **Authorization**: `authorize(operation, path, req)` for per-op checks
- **Size Limits**: `maxFileSize` prevents large file reads/writes

### WebSocket Protocol

Client sends:
```json
{ "type": "list", "requestId": 1, "path": "/dir" }
```

Server responds:
```json
{ "type": "result", "requestId": 1, "success": true, "data": [...] }
```

Operations: `list`, `stat`, `read`, `write`, `mkdir`, `delete`, `rename`, `copy`, `exists`, `search`

## Publishing

```bash
npm run clean && npm run build
npm publish
```
