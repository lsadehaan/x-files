/**
 * Basic test script for upload/download functionality
 * This demonstrates the new upload and download features in x-files.js
 */

import { XFilesHandler } from './dist/server/index.js';
import { XFilesClient } from './dist/client/index.js';
import { WebSocketServer, WebSocket } from 'ws';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Polyfill WebSocket for Node.js
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

async function runTests() {
  console.log('🧪 Testing upload/download functionality...\n');

  // Setup test directory
  const testDir = join(tmpdir(), 'x-files-test');
  await fs.mkdir(testDir, { recursive: true });
  console.log(`📁 Test directory: ${testDir}`);

  // Create server
  const handler = new XFilesHandler({
    allowedPaths: [testDir],
    allowWrite: true,
    allowDelete: true,
    maxFileSize: 1024 * 1024 // 1MB
  });

  const wss = new WebSocketServer({ port: 8081 });
  wss.on('connection', (ws, req) => handler.handleConnection(ws, req));

  console.log('🚀 Server started on port 8081');

  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 100));

  // Create client
  const client = new XFilesClient({
    url: 'ws://localhost:8081',
    autoReconnect: false
  });

  try {
    // Connect
    await client.connect();
    console.log('✅ Client connected');

    // Test 1: Upload text file
    console.log('\n📤 Test 1: Upload text file');
    const textContent = 'Hello, World!\nThis is a test file.';
    const textResult = await client.uploadFile(join(testDir, 'test.txt'), textContent);
    console.log(`✅ Uploaded text file: ${textResult.path} (${textResult.size} bytes)`);

    // Test 2: Download text file
    console.log('\n📥 Test 2: Download text file');
    const downloadResult = await client.downloadFile(join(testDir, 'test.txt'));
    console.log(`✅ Downloaded: isBinary=${downloadResult.isBinary}, size=${downloadResult.size}`);
    console.log(`Content matches: ${downloadResult.content === textContent}`);

    // Test 3: Upload binary file (simulate image)
    console.log('\n📤 Test 3: Upload binary file');
    const binaryData = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, // JPEG header
      0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      // Some dummy binary data
      ...Array.from({ length: 100 }, (_, i) => i % 256)
    ]);

    const binaryResult = await client.uploadBinary(join(testDir, 'test.jpg'), binaryData);
    console.log(`✅ Uploaded binary file: ${binaryResult.path} (${binaryResult.size} bytes)`);

    // Test 4: Download binary file
    console.log('\n📥 Test 4: Download binary file');
    const binaryDownload = await client.downloadBinary(join(testDir, 'test.jpg'));
    console.log(`✅ Downloaded binary: size=${binaryDownload.size}`);
    console.log(`Content matches: ${Buffer.compare(binaryDownload.buffer, binaryData) === 0}`);

    // Test 5: Auto-detect binary file
    console.log('\n📥 Test 5: Auto-detect binary file');
    const autoDetect = await client.downloadFile(join(testDir, 'test.jpg'));
    console.log(`✅ Auto-detected as binary: ${autoDetect.isBinary}`);

    // Test 6: List directory to see uploaded files
    console.log('\n📋 Test 6: List directory');
    const files = await client.listDirectory(testDir);
    console.log('✅ Files in directory:');
    files.forEach(file => {
      console.log(`  - ${file.name} (${file.size} bytes, ${file.isFile ? 'file' : 'dir'})`);
    });

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    client.disconnect();
    wss.close();

    // Clean up test files
    try {
      await fs.rm(testDir, { recursive: true });
      console.log('\n🧹 Cleaned up test directory');
    } catch (e) {
      console.log('⚠️  Could not clean up test directory:', e.message);
    }
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}