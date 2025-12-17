#!/usr/bin/env node

/**
 * Setup ESLint for Obsidian Plugin
 * 
 * This script:
 * - Updates package.json with ESLint 9 devDependencies and scripts
 * - Ensures TypeScript version is >=4.8.4 (required for ESLint compatibility)
 * - Generates eslint.config.mjs (flat config) configuration file
 * - Generates .npmrc configuration file
 * 
 * Usage: node scripts/setup-eslint.mjs
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ESLINT_DEPS = {
  "@eslint/js": "^9.30.1",
  "@eslint/json": "^0.14.0",
  "@typescript-eslint/eslint-plugin": "^8.33.1",
  "@typescript-eslint/parser": "^8.33.1",
  "eslint": "^9.39.1",
  "eslint-plugin-obsidianmd": "^0.1.9",
  "globals": "^14.0.0",
  "typescript-eslint": "^8.35.1"
};

const ESLINT_SCRIPTS = {
  "lint": "eslint .",
  "lint:fix": "eslint . --fix"
};

const MIN_TYPESCRIPT_VERSION = "^4.8.4";

function generateEslintConfig(customRules = {}) {
  // Default custom rules (common overrides)
  const defaultRules = {
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-empty-function": "off",
    "no-prototype-builtins": "off",
    "@typescript-eslint/no-misused-promises": ["error", {
      "checksVoidReturn": {
        "attributes": false,
        "properties": false,
        "returns": false,
        "variables": false
      }
    }]
  };
  
  // Merge custom rules with defaults (custom rules take precedence)
  const rules = { ...defaultRules, ...customRules };
  
  // Format rules as JavaScript object string
  const rulesString = Object.entries(rules)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `      "${key}": "${value}"`;
      } else if (Array.isArray(value)) {
        const valueStr = JSON.stringify(value);
        return `      "${key}": ${valueStr}`;
      } else {
        const valueStr = JSON.stringify(value);
        return `      "${key}": ${valueStr}`;
      }
    })
    .join(',\n');
  
  return `// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
  {
    ignores: ["main.js", "node_modules/**", "dist/**", "*.js", "scripts/**"]
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { 
        project: "./tsconfig.json",
        sourceType: "module"
      },
      globals: {
        ...globals.browser,
        DomElementInfo: "readonly",
        SvgElementInfo: "readonly",
        activeDocument: "readonly",
        activeWindow: "readonly",
        ajax: "readonly",
        ajaxPromise: "readonly",
        createDiv: "readonly",
        createEl: "readonly",
        createFragment: "readonly",
        createSpan: "readonly",
        createSvg: "readonly",
        fish: "readonly",
        fishAll: "readonly",
        isBoolean: "readonly",
        nextFrame: "readonly",
        ready: "readonly",
        sleep: "readonly"
      }
    },
    // Custom rule overrides${Object.keys(customRules).length > 0 ? ' (migrated from .eslintrc)' : ''}
    rules: {
${rulesString}
    },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly"
      }
    }
  },
]);
`;
}

const NPMRC_CONTENT = "legacy-peer-deps=true\n";

function parseVersion(versionString) {
  // Remove ^, ~, >=, etc. and extract major.minor.patch
  const clean = versionString.replace(/^[\^~>=<]/, '');
  const parts = clean.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

// Removed unused compareVersions function

function isVersionCompatible(currentVersion, minVersion) {
  const current = parseVersion(currentVersion);
  const min = parseVersion(minVersion);
  
  if (current.major > min.major) return true;
  if (current.major < min.major) return false;
  if (current.minor > min.minor) return true;
  if (current.minor < min.minor) return false;
  return current.patch >= min.patch;
}

function migrateEslintrc(eslintrcPath) {
  try {
    const eslintrcContent = readFileSync(eslintrcPath, 'utf8');
    const eslintrc = JSON.parse(eslintrcContent);
    
    // Extract custom rules from .eslintrc
    const customRules = eslintrc.rules || {};
    
    console.log('✓ Found .eslintrc file - migrating rules to flat config format');
    
    return customRules;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.log('⚠ Warning: .eslintrc file is not valid JSON, using default rules');
    } else {
      console.log('⚠ Warning: Could not read .eslintrc file, using default rules');
    }
    return {};
  }
}

function fixBuiltinModules(esbuildConfigPath, projectRoot) {
  if (!existsSync(esbuildConfigPath)) {
    return false;
  }
  
  try {
    let content = readFileSync(esbuildConfigPath, 'utf8');
    let updated = false;
    
    // Check if it uses builtin-modules package
    if (content.includes("import builtins from \"builtin-modules\"") || 
        content.includes("import builtins from 'builtin-modules'")) {
      // Replace the import
      content = content.replace(
        /import\s+builtins\s+from\s+["']builtin-modules["'];?/g,
        "import { builtinModules } from \"module\";"
      );
      updated = true;
      console.log('✓ Updated esbuild.config.mjs: replaced builtin-modules with module.builtinModules');
    }
    
    // Check if it uses ...builtins (the spread)
    if (content.includes("...builtins") && !content.includes("...builtinModules")) {
      content = content.replace(/\.\.\.builtins/g, "...builtinModules");
      updated = true;
      console.log('✓ Updated esbuild.config.mjs: replaced builtins with builtinModules');
    }
    
    // Add existsSync import if not present and update entryPoints to detect main.ts location
    const hasExistsSyncImport = content.includes("existsSync") && (content.includes("from \"fs\"") || content.includes("from 'fs'"));
    const needsExistsSync = !hasExistsSyncImport;
    
    // Check if entryPoints needs to be updated to use detection logic
    const hasHardcodedEntryPoint = /entryPoints:\s*\[["'](src\/)?main\.ts["']\]/.test(content);
    const hasEntryPointVar = /const\s+entryPoint\s*=/.test(content);
    const entryPointIndex = hasEntryPointVar ? content.indexOf('const entryPoint') : -1;
    const esbuildContextIndex = content.indexOf('esbuild.context');
    const hasCorrectEntryPoint = hasEntryPointVar && 
      entryPointIndex >= 0 && 
      esbuildContextIndex >= 0 && 
      entryPointIndex < esbuildContextIndex;
    const hasEntryPointDetection = hasCorrectEntryPoint || (hasEntryPointVar && content.includes("existsSync(\"src/main.ts\")") || content.includes("existsSync('src/main.ts')"));
    
    // Always remove ALL entryPoint declarations first (we'll add it back in the correct place)
    // This ensures we don't have duplicates or incorrectly placed ones
    if (hasEntryPointVar) {
      // Remove comment lines that mention entry point detection
      content = content.replace(/\s*\/\/\s*.*[Dd]etect\s+entry\s+point.*?\n/gi, '');
      content = content.replace(/\s*\/\/\s*.*entry\s+point.*?\n/gi, '');
      // Remove const entryPoint declarations - match the full line including any whitespace
      content = content.replace(/^\s*const\s+entryPoint\s*=.*?;\s*$/gm, '');
      // Also remove any that might be on the same line as other code (less common)
      content = content.replace(/\s*const\s+entryPoint\s*=\s*existsSync\([^)]+\)\s*\?[^;]+;\s*/g, '');
      content = content.replace(/\s*const\s+entryPoint\s*=\s*[^;]+;\s*/g, '');
      // Clean up any double newlines that might result
      content = content.replace(/\n\n\n+/g, '\n\n');
      updated = true;
      console.log('✓ Removed existing entryPoint declaration(s)');
    }
    
    if (hasHardcodedEntryPoint || (hasEntryPointVar && !hasCorrectEntryPoint)) {
      // Add existsSync import if needed
      if (needsExistsSync) {
        // Find the import statement and add existsSync to it, or add a new import
        if (content.includes("import { builtinModules } from \"module\"")) {
          content = content.replace(
            /import\s+{\s*builtinModules\s*}\s+from\s+["']module["']/,
            "import { builtinModules } from \"module\";\nimport { existsSync } from \"fs\";"
          );
        } else if (content.includes("import { builtinModules } from 'module'")) {
          content = content.replace(
            /import\s+{\s*builtinModules\s*}\s+from\s+['']module['']/,
            "import { builtinModules } from 'module';\nimport { existsSync } from 'fs';"
          );
        } else {
          // Add import after process import or at the top
          const processImportMatch = content.match(/import\s+process\s+from\s+["']process["'];?/);
          if (processImportMatch) {
            content = content.replace(
              /(import\s+process\s+from\s+["']process["'];?)/,
              "$1\nimport { existsSync } from \"fs\";"
            );
          } else {
            // Add at the beginning after first import
            const firstImportMatch = content.match(/^import\s+[^;]+;?/m);
            if (firstImportMatch) {
              content = content.replace(
                /^(import\s+[^;]+;?)/m,
                "$1\nimport { existsSync } from \"fs\";"
              );
            }
          }
        }
        updated = true;
        console.log('✓ Updated esbuild.config.mjs: added existsSync import');
      }
      
      // Replace hardcoded entryPoints with detection logic or fix incorrectly placed ones
      // Re-check after removal (content may have changed)
      const entryPointPattern = /entryPoints:\s*\[["'](src\/)?main\.ts["']\]/;
      const currentHasEntryPointVar = /const\s+entryPoint\s*=/.test(content);
      const currentEntryPointIndex = currentHasEntryPointVar ? content.indexOf('const entryPoint') : -1;
      const currentEsbuildContextIndex = content.indexOf('esbuild.context');
      const currentHasCorrectEntryPoint = currentHasEntryPointVar && 
        currentEntryPointIndex >= 0 && 
        currentEsbuildContextIndex >= 0 && 
        currentEntryPointIndex < currentEsbuildContextIndex;
      
      // If we have a hardcoded entry point OR the entryPoint var is missing/incorrectly placed, fix it
      if (entryPointPattern.test(content) || !currentHasCorrectEntryPoint) {
        // Add entryPoint declaration if it doesn't exist or is incorrectly placed
        if (!currentHasCorrectEntryPoint) {
          // Find the "const prod" line - it's almost always present and right before esbuild.context
          const prodMatch = content.match(/(const\s+prod\s*=.*?;)\s*\n/);
          if (prodMatch) {
            // Insert entryPoint declaration right after const prod line
            const entryPointCode = `\n// Detect entry point: prefer src/main.ts, fallback to main.ts\nconst entryPoint = existsSync("src/main.ts") ? "src/main.ts" : "main.ts";\n`;
            content = content.replace(
              /(const\s+prod\s*=.*?;)\s*\n/,
              "$1" + entryPointCode
            );
          } else {
            // Fallback: find esbuild.context and insert before it (but outside object literal)
            // Look for the line that starts with "const context = await esbuild.context" or similar
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (/^\s*const\s+\w+\s*=\s*(?:await\s+)?esbuild\.context\s*\(/.test(lines[i])) {
                const indent = lines[i].match(/^(\s*)/)[1];
                const entryPointCode = `${indent}// Detect entry point: prefer src/main.ts, fallback to main.ts\n${indent}const entryPoint = existsSync("src/main.ts") ? "src/main.ts" : "main.ts";\n`;
                lines.splice(i, 0, entryPointCode);
                content = lines.join('\n');
                break;
              }
            }
          }
        }
        
        // Then replace the entryPoints line to use the variable
        content = content.replace(
          /(\s+)entryPoints:\s*\[["'](src\/)?main\.ts["']\],?/,
          "$1entryPoints: [entryPoint],"
        );
        updated = true;
        console.log('✓ Updated esbuild.config.mjs: added entry point detection (supports both src/main.ts and main.ts)');
      } else if (hasEntryPointVar && /entryPoints:\s*\[entryPoint\]/.test(content)) {
        // Already has entry point detection, nothing to do
      } else if (hasEntryPointVar) {
        // Has entryPoint var but entryPoints line doesn't use it - fix that
        content = content.replace(
          /(\s+)entryPoints:\s*\[["'][^"']+["']\],?/,
          "$1entryPoints: [entryPoint],"
        );
        updated = true;
        console.log('✓ Updated esbuild.config.mjs: fixed entryPoints to use entryPoint variable');
      }
    }
    
    if (updated) {
      writeFileSync(esbuildConfigPath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.log('⚠ Warning: Could not update esbuild.config.mjs:', error.message);
    return false;
  }
}

function setupESLint() {
  // Get the directory where this script is located
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  // Resolve project root (one level up from scripts folder)
  const projectRoot = join(scriptDir, '..');
  const packageJsonPath = join(projectRoot, 'package.json');
  const eslintConfigPath = join(projectRoot, 'eslint.config.mjs');
  const esbuildConfigPath = join(projectRoot, 'esbuild.config.mjs');
  const eslintrcPath = join(projectRoot, '.eslintrc');
  const eslintrcJsonPath = join(projectRoot, '.eslintrc.json');
  const npmrcPath = join(projectRoot, '.npmrc');
  
  try {
    // Read package.json
    const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    
    let updated = false;
    let migratingFromEslint8 = false;
    let customRules = {};
    
    // Check if migrating from ESLint 8
    const currentEslintVersion = packageJson.devDependencies?.eslint || packageJson.dependencies?.eslint;
    if (currentEslintVersion && currentEslintVersion.match(/^[\^~]?8\./)) {
      migratingFromEslint8 = true;
      console.log('🔄 Detected ESLint 8 - migrating to ESLint 9...\n');
    }
    
    // Check for legacy .eslintrc files and migrate rules
    if (existsSync(eslintrcPath)) {
      customRules = migrateEslintrc(eslintrcPath);
    } else if (existsSync(eslintrcJsonPath)) {
      customRules = migrateEslintrc(eslintrcJsonPath);
    }
    
    // Check and update TypeScript version
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
      updated = true;
    }
    
    const currentTsVersion = packageJson.devDependencies.typescript || packageJson.dependencies?.typescript;
    if (currentTsVersion && !isVersionCompatible(currentTsVersion, MIN_TYPESCRIPT_VERSION)) {
      console.log(`⚠ TypeScript version ${currentTsVersion} is not compatible with ESLint (requires >=4.8.4)`);
      console.log(`✓ Updating TypeScript to ${MIN_TYPESCRIPT_VERSION}`);
      packageJson.devDependencies.typescript = MIN_TYPESCRIPT_VERSION;
      updated = true;
    } else if (!currentTsVersion) {
      console.log(`✓ Adding TypeScript ${MIN_TYPESCRIPT_VERSION}`);
      packageJson.devDependencies.typescript = MIN_TYPESCRIPT_VERSION;
      updated = true;
    }
    
    // Remove deprecated builtin-modules package if it exists
    if (packageJson.devDependencies?.["builtin-modules"]) {
      delete packageJson.devDependencies["builtin-modules"];
      updated = true;
      console.log('✓ Removed deprecated builtin-modules package (use module.builtinModules instead)');
    }
    if (packageJson.dependencies?.["builtin-modules"]) {
      delete packageJson.dependencies["builtin-modules"];
      updated = true;
      console.log('✓ Removed deprecated builtin-modules package (use module.builtinModules instead)');
    }
    
    // Add or update ESLint devDependencies
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
      const currentCommand = packageJson.scripts[script];
      // Remove --ext flag if present (ESLint 8 legacy)
      if (currentCommand && currentCommand.includes('--ext')) {
        console.log(`✓ Updating ${script} script: removing --ext flag (not needed in ESLint 9)`);
        updated = true;
      }
      if (!currentCommand || currentCommand !== command) {
        packageJson.scripts[script] = command;
        updated = true;
        if (currentCommand) {
          console.log(`✓ Updated script: ${script}`);
        } else {
          console.log(`✓ Added script: ${script}`);
        }
      }
    }
    
    // Generate eslint.config.mjs file (flat config for ESLint 9)
    let eslintConfigUpdated = false;
    const newConfig = generateEslintConfig(customRules);
    
    if (!existsSync(eslintConfigPath)) {
      writeFileSync(eslintConfigPath, newConfig, 'utf8');
      console.log('✓ Created eslint.config.mjs configuration file');
      eslintConfigUpdated = true;
    } else {
      // Update existing file to ensure it has the correct config
      const existingContent = readFileSync(eslintConfigPath, 'utf8');
      if (existingContent.trim() !== newConfig.trim()) {
        writeFileSync(eslintConfigPath, newConfig, 'utf8');
        console.log('✓ Updated eslint.config.mjs configuration file');
        eslintConfigUpdated = true;
      }
    }
    
    // Remove legacy .eslintrc files after migration
    if (existsSync(eslintrcPath)) {
      try {
        unlinkSync(eslintrcPath);
        console.log('✓ Removed legacy .eslintrc file (migrated to eslint.config.mjs)');
      } catch {
        console.log('⚠ Warning: Could not remove .eslintrc file');
      }
    }
    if (existsSync(eslintrcJsonPath)) {
      try {
        unlinkSync(eslintrcJsonPath);
        console.log('✓ Removed legacy .eslintrc.json file (migrated to eslint.config.mjs)');
      } catch {
        console.log('⚠ Warning: Could not remove .eslintrc.json file');
      }
    }
    
    // Fix builtin-modules in esbuild.config.mjs and entryPoints
    const esbuildConfigUpdated = fixBuiltinModules(esbuildConfigPath, projectRoot);
    
    // Generate .npmrc file
    let npmrcUpdated = false;
    if (!existsSync(npmrcPath)) {
      writeFileSync(npmrcPath, NPMRC_CONTENT, 'utf8');
      console.log('✓ Created .npmrc configuration file');
      npmrcUpdated = true;
    } else {
      const existingContent = readFileSync(npmrcPath, 'utf8');
      if (existingContent !== NPMRC_CONTENT) {
        writeFileSync(npmrcPath, NPMRC_CONTENT, 'utf8');
        console.log('✓ Updated .npmrc configuration file');
        npmrcUpdated = true;
      }
    }
    
    if (updated) {
      // Write back to package.json with proper formatting
      const updatedContent = JSON.stringify(packageJson, null, '\t') + '\n';
      writeFileSync(packageJsonPath, updatedContent, 'utf8');
      console.log('\n✓ package.json updated successfully!');
    }
    
    if (updated || eslintConfigUpdated || esbuildConfigUpdated || npmrcUpdated) {
      console.log('\n✓ ESLint setup complete!');
      if (migratingFromEslint8) {
        console.log('✓ Successfully migrated from ESLint 8 to ESLint 9');
      }
      console.log('\nNext steps:');
      console.log('  1. Run: npm install');
      console.log('  2. Run: npm run lint');
    } else {
      console.log('✓ Everything is already set up correctly!');
      console.log('  Run: npm run lint');
    }
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('❌ Error: package.json not found in project root');
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

