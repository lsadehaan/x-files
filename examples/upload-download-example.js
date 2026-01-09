/**
 * Example usage of upload/download features in x-files.js
 */

import { XFilesHandler } from 'x-files.js';
import { XFilesClient } from 'x-files.js/client';
import { WebSocketServer } from 'ws';
import { readFile, writeFile } from 'fs/promises';

// Server setup
const handler = new XFilesHandler({
  allowedPaths: ['/home/user/uploads'],
  allowWrite: true,
  maxFileSize: 10 * 1024 * 1024 // 10MB limit
});

const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws, req) => handler.handleConnection(ws, req));

// Client usage examples
const client = new XFilesClient({ url: 'ws://localhost:8080' });

await client.connect();

// Example 1: Upload a text file
await client.uploadFile('/home/user/uploads/readme.txt', 'Hello World!');

// Example 2: Upload a binary file (e.g., from file input)
const imageBuffer = await readFile('./local-image.jpg');
await client.uploadBinary('/home/user/uploads/image.jpg', imageBuffer);

// Example 3: Upload base64 encoded data
const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANS...';
const base64Content = base64Data.split(',')[1]; // Remove data URL prefix
await client.uploadFile('/home/user/uploads/image.png', base64Content, 'utf-8', true);

// Example 4: Download a text file
const { content, isBinary } = await client.downloadFile('/home/user/uploads/readme.txt');
console.log('Text content:', content);

// Example 5: Download a binary file
const { buffer } = await client.downloadBinary('/home/user/uploads/image.jpg');
await writeFile('./downloaded-image.jpg', buffer);

// Example 6: Download with auto-detection
const result = await client.downloadFile('/home/user/uploads/unknown-file.ext');
if (result.isBinary) {
  console.log('File is binary, content is base64 encoded');
  const buffer = Buffer.from(result.content, 'base64');
  // Handle binary data
} else {
  console.log('File is text:', result.content);
}

client.disconnect();