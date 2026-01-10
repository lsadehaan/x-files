#!/usr/bin/env node
/**
 * Version bump script for x-files.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const packageJsonPath = join(rootDir, 'package.json');
const packageLockPath = join(rootDir, 'package-lock.json');

function getVersion() {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function setVersion(newVersion) {
  // Update package.json
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = newVersion;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✅ Updated package.json to ${newVersion}`);

  // Update package-lock.json
  const packageLock = JSON.parse(readFileSync(packageLockPath, 'utf8'));
  packageLock.version = newVersion;
  packageLock.packages[""].version = newVersion;
  writeFileSync(packageLockPath, JSON.stringify(packageLock, null, 2) + '\n');
  console.log(`✅ Updated package-lock.json to ${newVersion}`);
}

function bumpVersion(type) {
  const currentVersion = getVersion();
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      console.error('Invalid version type. Use: major, minor, or patch');
      process.exit(1);
  }

  console.log(`Bumping version from ${currentVersion} to ${newVersion}`);
  setVersion(newVersion);
  return newVersion;
}

// CLI usage
const command = process.argv[2];
const versionArg = process.argv[3];

if (!command) {
  console.log(`Current version: ${getVersion()}`);
  console.log('Usage:');
  console.log('  node scripts/version.js get');
  console.log('  node scripts/version.js set <version>');
  console.log('  node scripts/version.js bump <major|minor|patch>');
  process.exit(0);
}

switch (command) {
  case 'get':
    console.log(getVersion());
    break;
  case 'set':
    if (!versionArg) {
      console.error('Version required for set command');
      process.exit(1);
    }
    setVersion(versionArg);
    break;
  case 'bump':
    if (!versionArg) {
      console.error('Version type required for bump command (major, minor, or patch)');
      process.exit(1);
    }
    bumpVersion(versionArg);
    break;
  default:
    console.error('Unknown command. Use: get, set, or bump');
    process.exit(1);
}