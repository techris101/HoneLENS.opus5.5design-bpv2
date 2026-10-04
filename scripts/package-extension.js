/**
 * HoneLENS Production Packaging Script
 * Assembles the production ZIP bundle for Chrome Web Store and GitHub Releases.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OUT_DIR = 'dist';
const ZIP_NAME = 'honelens-extension-v1.zip';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log('Packaging HoneLENS Chrome Extension...');

const filesToInclude = [
  'manifest.json',
  'background',
  'sidepanel',
  'styles',
  'assets',
  'modules'
];

try {
  // Check platform
  if (process.platform === 'win32') {
    const zipPath = path.resolve(OUT_DIR, ZIP_NAME);
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    const powershellCmd = `Compress-Archive -Path ${filesToInclude.join(', ')} -DestinationPath ${zipPath} -Force`;
    execSync(`powershell -Command "${powershellCmd}"`, { stdio: 'inherit' });
  } else {
    const zipPath = path.resolve(OUT_DIR, ZIP_NAME);
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    execSync(`zip -r ${zipPath} ${filesToInclude.join(' ')}`, { stdio: 'inherit' });
  }
  console.log(`✅ Successfully generated: ${path.join(OUT_DIR, ZIP_NAME)}`);
} catch (err) {
  console.error('Packaging error:', err);
  process.exit(1);
}
