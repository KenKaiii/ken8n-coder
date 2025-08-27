#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function calculateFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function updateHashManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let updated = false;
  
  log(COLORS.BLUE, '📝 Updating file hashes in manifest...');
  
  for (const file of manifest.required_files) {
    if (file.validation === 'hash_check') {
      // Use source file, not build file for hash calculation
      const sourceFile = file.path.replace('packages/ken8n-coder/', '');
      const hash = calculateFileHash(sourceFile);
      
      if (hash) {
        if (!manifest.file_hashes[file.path] || manifest.file_hashes[file.path] !== hash) {
          log(COLORS.YELLOW, `  📝 Updated hash for ${file.path}`);
          manifest.file_hashes[file.path] = hash;
          updated = true;
        }
      }
    }
  }
  
  if (updated) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    log(COLORS.GREEN, '✅ Manifest updated with latest hashes');
  } else {
    log(COLORS.GREEN, '✅ All hashes up to date');
  }
}

function validateRelease(buildDir, updateHashes = false) {
  log(COLORS.BLUE, `🔍 Validating release build: ${buildDir}`);
  
  // Load manifest
  const manifestPath = path.join(__dirname, 'release-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    log(COLORS.RED, `❌ FATAL: release-manifest.json not found at ${manifestPath}`);
    process.exit(1);
  }
  
  if (updateHashes) {
    updateHashManifest(manifestPath);
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let errors = [];
  let warnings = [];
  let hashMismatches = [];
  
  // Validate each required file
  for (const file of manifest.required_files) {
    const filePath = path.join(buildDir, file.path);
    
    if (!fs.existsSync(filePath)) {
      errors.push(`❌ MISSING: ${file.path} - ${file.description}`);
      continue;
    }
    
    log(COLORS.GREEN, `✅ Found: ${file.path}`);
    
    // Hash validation - detects ANY change
    if (file.validation === 'hash_check') {
      const currentHash = calculateFileHash(filePath);
      const expectedHash = manifest.file_hashes[file.path];
      
      if (!expectedHash) {
        warnings.push(`⚠️  NO HASH: ${file.path} - run with --update-hashes first`);
      } else if (currentHash !== expectedHash) {
        hashMismatches.push(`❌ HASH MISMATCH: ${file.path}`);
        hashMismatches.push(`   Expected: ${expectedHash}`);
        hashMismatches.push(`   Got:      ${currentHash}`);
        hashMismatches.push(`   This means the file was changed but not updated in the release!`);
        errors.push(`❌ OUTDATED: ${file.path} - content changed but not updated in release`);
      } else {
        log(COLORS.GREEN, `  ✓ Hash matches (content verified)`);
      }
    }
  }
  
  // Results
  if (errors.length > 0) {
    log(COLORS.RED, `\n${COLORS.BOLD}❌ RELEASE VALIDATION FAILED${COLORS.RESET}`);
    log(COLORS.RED, `Found ${errors.length} critical errors:`);
    errors.forEach(error => log(COLORS.RED, `  ${error}`));
    
    if (hashMismatches.length > 0) {
      log(COLORS.RED, `\n🔍 Hash Mismatches (files were changed but not updated):`);
      hashMismatches.forEach(mismatch => log(COLORS.RED, `  ${mismatch}`));
      log(COLORS.YELLOW, `\n💡 To fix: Copy the updated files from source to the build, or run build again`);
    }
    
    if (warnings.length > 0) {
      log(COLORS.YELLOW, `\nWarnings:`);
      warnings.forEach(warning => log(COLORS.YELLOW, `  ${warning}`));
    }
    
    log(COLORS.RED, `\n🚫 BUILD MUST NOT PROCEED - Fix errors above`);
    log(COLORS.RED, `This ensures NO changes are missed in releases!`);
    process.exit(1);
  }
  
  log(COLORS.GREEN, `\n${COLORS.BOLD}✅ RELEASE VALIDATION PASSED${COLORS.RESET}`);
  log(COLORS.GREEN, `All critical files present and unchanged from source`);
  
  if (warnings.length > 0) {
    log(COLORS.YELLOW, `\nWarnings (non-blocking):`);
    warnings.forEach(warning => log(COLORS.YELLOW, `  ${warning}`));
    log(COLORS.YELLOW, `Run with --update-hashes to fix hash warnings`);
  }
  
  log(COLORS.GREEN, `\n🛡️  No file changes were missed - release is complete!`);
  return true;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const updateHashes = args.includes('--update-hashes');
  const buildDir = args.find(arg => !arg.startsWith('--'));
  
  if (!buildDir) {
    log(COLORS.RED, 'Usage: validate-release.cjs [--update-hashes] <build-directory>');
    log(COLORS.YELLOW, 'Example: validate-release.cjs dist/ken8n-coder-linux-x64');
    log(COLORS.YELLOW, '         validate-release.cjs --update-hashes dist/ken8n-coder-linux-x64');
    log(COLORS.BLUE, '\n--update-hashes: Update the manifest with current file hashes (do this after making changes)');
    process.exit(1);
  }
  
  validateRelease(buildDir, updateHashes);
}

module.exports = { validateRelease, updateHashManifest };