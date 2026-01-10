/**
 * Simple test server for tabbed browser testing
 */

import { XFilesHandler } from './dist/server/index.js';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current working directory
const cwd = process.cwd();

console.log('🚀 Starting X-Files Test Server');
console.log(`📁 Serving files from: ${cwd}`);

// Create some test directories and files if they don't exist
const testDir = path.join(cwd, 'test-files');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });

  // Create some test files
  fs.writeFileSync(path.join(testDir, 'readme.txt'), 'This is a test file for the tabbed browser.\n\nYou can navigate between different directories using tabs!');
  fs.writeFileSync(path.join(testDir, 'example.json'), JSON.stringify({
    name: 'Test Project',
    version: '1.0.0',
    description: 'Testing the tabbed file browser'
  }, null, 2));

  // Create a subdirectory
  const subDir = path.join(testDir, 'subdirectory');
  fs.mkdirSync(subDir, { recursive: true });
  fs.writeFileSync(path.join(subDir, 'nested-file.txt'), 'This file is in a subdirectory.\n\nYou can open this directory in a new tab!');

  console.log('📁 Created test files in test-files/ directory');
}

// Server setup with more permissive settings for testing
const handler = new XFilesHandler({
  allowedPaths: [cwd], // Allow browsing entire project directory
  allowWrite: true,
  allowDelete: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB limit
  // Add authentication for demo purposes (optional)
  authenticate: async (req) => {
    // Allow all connections for testing
    return true;
  },
  // Add authorization for demo purposes (optional)
  authorize: async (operation, path, req) => {
    // Allow all operations for testing
    return true;
  }
});

const wss = new WebSocketServer({
  port: 3000,
  perMessageDeflate: false
});

wss.on('connection', (ws, req) => {
  console.log(`🔌 New connection from ${req.socket.remoteAddress}`);
  handler.handleConnection(ws, req);
});

wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
});

console.log('🌐 WebSocket server running on ws://localhost:3000');
console.log('📖 Open test-tabbed-browser.html in your browser to test');
console.log('🛑 Press Ctrl+C to stop');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  wss.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

// Keep the process alive
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
});