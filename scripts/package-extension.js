/**
 * Audio Master - Extension Packaging Script
 * Creates a clean, distribution-ready ZIP archive for the Chrome Web Store.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const distDir = path.resolve('dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const outputFile = path.join(distDir, 'audio-master-v1.0.0.zip');
if (fs.existsSync(outputFile)) {
  fs.unlinkSync(outputFile);
}

// Files and folders to include
const includeItems = [
  'manifest.json',
  'icons',
  'popup',
  'mini-player',
  'options',
  'background',
  'offscreen',
  'content',
  'engine',
  'storage'
];

// Use PowerShell's Compress-Archive on Windows
const itemsToCompress = includeItems
  .filter(item => fs.existsSync(path.resolve(item)))
  .map(item => `'${item}'`)
  .join(', ');

const psCommand = `powershell -NoProfile -Command "$ProgressPreference = 'SilentlyContinue'; Compress-Archive -Path ${itemsToCompress} -DestinationPath '${outputFile}' -Force"`;

console.log('Packaging Audio Master extension...');
try {
  execSync(psCommand, { stdio: 'inherit' });
  const stats = fs.statSync(outputFile);
  console.log(`Successfully created: ${outputFile} (${(stats.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error('Packaging failed:', err.message);
}
