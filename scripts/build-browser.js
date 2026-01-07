#!/usr/bin/env node
/**
 * Build browser bundle for x-files.js client
 */

import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function build() {
  try {
    console.log('Building browser bundle...');

    await esbuild.build({
      entryPoints: [join(rootDir, 'src/client/index.ts')],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      outfile: join(rootDir, 'dist/client/browser-bundle.js'),
      sourcemap: true,
      minify: false,
      external: [],
    });

    console.log('✅ Browser bundle created: dist/client/browser-bundle.js');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
