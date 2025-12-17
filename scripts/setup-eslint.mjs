#!/usr/bin/env node

/**
 * Setup ESLint for Obsidian Plugin
 * 
 * This script updates package.json to include:
 * - ESLint devDependencies
 * - ESLint lint scripts
 * 
 * Usage: node scripts/setup-eslint.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ESLINT_DEPS = {
  "@eslint/json": "^0.14.0",
  "@typescript-eslint/eslint-plugin": "^8.50.0",
  "@typescript-eslint/parser": "^8.50.0",
  "eslint": "^8.57.1",
  "eslint-plugin-obsidianmd": "^0.1.9",
  "typescript-eslint": "^8.50.0"
};

const ESLINT_SCRIPTS = {
  "lint": "eslint . --ext .ts",
  "lint:fix": "eslint . --ext .ts --fix"
};

function setupESLint() {
  const packageJsonPath = join(process.cwd(), 'package.json');
  
  try {
    // Read package.json
    const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    
    let updated = false;
    
    // Add or update devDependencies
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
      updated = true;
    }
    
    for (const [dep, version] of Object.entries(ESLINT_DEPS)) {
      if (!packageJson.devDependencies[dep] || packageJson.devDependencies[dep] !== version) {
        packageJson.devDependencies[dep] = version;
        updated = true;
        console.log(`✓ Added/updated devDependency: ${dep}@${version}`);
      }
    }
    
    // Add or update scripts
    if (!packageJson.scripts) {
      packageJson.scripts = {};
      updated = true;
    }
    
    for (const [script, command] of Object.entries(ESLINT_SCRIPTS)) {
      if (!packageJson.scripts[script] || packageJson.scripts[script] !== command) {
        packageJson.scripts[script] = command;
        updated = true;
        console.log(`✓ Added/updated script: ${script}`);
      }
    }
    
    if (updated) {
      // Write back to package.json with proper formatting
      const updatedContent = JSON.stringify(packageJson, null, '\t') + '\n';
      writeFileSync(packageJsonPath, updatedContent, 'utf8');
      console.log('\n✓ package.json updated successfully!');
      console.log('\nNext steps:');
      console.log('  1. Run: npm install');
      console.log('  2. Copy .eslintrc and .npmrc files to your project root');
      console.log('  3. Run: npm run lint');
    } else {
      console.log('✓ package.json already has all ESLint dependencies and scripts');
    }
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('❌ Error: package.json not found in current directory');
      process.exit(1);
    } else if (error instanceof SyntaxError) {
      console.error('❌ Error: package.json is not valid JSON');
      console.error(error.message);
      process.exit(1);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

setupESLint();

