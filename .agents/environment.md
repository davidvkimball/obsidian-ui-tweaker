<!--
Source: Based on Obsidian Sample Plugin and Sample Theme
Last synced: See sync-status.json for authoritative sync dates
Update frequency: Check Obsidian Sample Plugin and Sample Theme repos for updates
Applicability: Plugin / Theme
-->

# Environment & tooling

## Plugins

- Node.js: use current LTS (Node 18+ recommended).
- **Package manager: npm** (required for this sample - `package.json` defines npm scripts and dependencies).
- **Bundler: esbuild** (required for this sample - `esbuild.config.mjs` and build scripts depend on it). Alternative bundlers like Rollup or webpack are acceptable for other projects if they bundle all external dependencies into `main.js`.
- Types: `obsidian` type definitions.

**Note**: This sample project has specific technical dependencies on npm and esbuild. If you're creating a plugin from scratch, you can choose different tools, but you'll need to replace the build configuration accordingly.

### Install

```bash
npm install
```

### Dev (watch)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

**Important for AI Agents**: Always run `npm run build` after making changes to plugins to catch build errors early. If npm is not installed, install it first with `npm install` (or install Node.js if npm is not available).

### Linting

- To use eslint install eslint from terminal: `npm install -g eslint`
- To use eslint to analyze this project use this command: `eslint src/main.ts` (note: `main.ts` is in `src/`, not root)
- eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder: `eslint ./src/`

## Themes

- **Optional**: Node.js and npm if using SCSS/Sass preprocessors or build tools.
- **Simple themes**: Can be developed with just CSS and `manifest.json` (no build tools required).
- **SCSS themes**: Use Sass/SCSS compiler (e.g., `sass`, `node-sass`, or build tools like Vite).
- No TypeScript or bundler required for basic themes.

### Simple Theme Setup

No build tools needed - just edit `theme.css` directly.

### SCSS Theme Setup

```bash
npm install -D sass
npm run build  # Compile SCSS to CSS
```

### Theme Build (Grunt)

For themes using Grunt (like Obsidian Sample Theme):

```bash
npx grunt build
```

**Important for AI Agents**: Always run `npx grunt build` after making changes to themes to catch build errors early. If npm is not installed, install it first with `npm install` (or install Node.js if npm is not available).

### Linting (Optional)

- Use `stylelint` for CSS/SCSS linting: `npm install -D stylelint`
- Configure stylelint for Obsidian theme conventions


