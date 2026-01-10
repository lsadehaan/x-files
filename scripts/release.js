#!/usr/bin/env node
/**
 * Release script for x-files.js
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function getCurrentVersion() {
  const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
  return packageJson.version;
}

function execCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    const output = execSync(command, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: 'inherit'
    });
    console.log(`✅ ${description} completed`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', {
      cwd: rootDir,
      encoding: 'utf8'
    });
    return status.trim() === '';
  } catch (error) {
    console.error('❌ Failed to check git status:', error.message);
    return false;
  }
}

function createRelease() {
  const version = getCurrentVersion();
  const tagName = `v${version}`;

  console.log(`🚀 Starting release process for x-files.js v${version}`);

  // Check if working directory is clean
  if (!checkGitStatus()) {
    console.error('❌ Working directory is not clean. Please commit or stash your changes.');
    process.exit(1);
  }

  // Build the project
  execCommand('npm run build', 'Building project');

  // Run tests
  execCommand('npm test', 'Running tests');

  // Create and push tag
  execCommand(`git tag -a ${tagName} -m "Release ${tagName}"`, `Creating tag ${tagName}`);
  execCommand(`git push origin ${tagName}`, `Pushing tag ${tagName}`);

  console.log(`🎉 Release ${tagName} completed!`);
  console.log(`📦 The GitHub Actions workflow will now:`);
  console.log(`   1. Run tests and build`);
  console.log(`   2. Publish to NPM`);
  console.log(`   3. Create GitHub release`);
  console.log(`🔗 Monitor progress at: https://github.com/lsadehaan/x-files/actions`);
}

// CLI usage
const command = process.argv[2];

if (!command || command === '--help' || command === '-h') {
  console.log('x-files.js Release Script');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/release.js create    # Create and push release tag');
  console.log('  node scripts/release.js version   # Show current version');
  console.log('');
  console.log('Prerequisites:');
  console.log('  - Clean working directory (no uncommitted changes)');
  console.log('  - Proper NPM_TOKEN secret configured in GitHub');
  console.log('  - Version already bumped in package.json');
  process.exit(0);
}

switch (command) {
  case 'create':
    createRelease();
    break;
  case 'version':
    console.log(`Current version: ${getCurrentVersion()}`);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Use --help for usage information');
    process.exit(1);
}