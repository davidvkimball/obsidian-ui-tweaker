<!--
Source: Based on Obsidian developer docs warnings, community patterns, and API best practices
Last synced: See sync-status.json for authoritative sync dates
Update frequency: Update as common issues are identified
Applicability: Plugin
-->

# Common Pitfalls

This document covers common mistakes and gotchas when developing Obsidian plugins. Always verify API details in `.ref/obsidian-api/obsidian.d.ts` as it's the authoritative source.

## Async/Await Issues

**Problem**: Forgetting to await `loadData()` or `saveData()` causes settings not to persist.

**Wrong**:
```ts
onload() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, this.loadData()); // Missing await!
}
```

**Correct**:
```ts
async onload() {
  await this.loadSettings(); // Properly awaited
}

async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}
```

**Also**: Always await `saveData()`:
```ts
async saveSettings() {
  await this.saveData(this.settings); // Don't forget await!
}
```

## Settings Object.assign Gotcha

**Source**: Warning from `.ref/obsidian-developer-docs/en/Plugins/User interface/Settings.md`

**Problem**: `Object.assign()` performs a shallow copy. Nested properties share references, causing changes to affect all copies.

**Wrong** (with nested properties):
```ts
interface MySettings {
  nested: { value: string };
}

const DEFAULT_SETTINGS: MySettings = {
  nested: { value: "default" }
};

// This creates a shallow copy - nested properties share references!
this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
```

**Correct**: Use deep copy for nested properties:
```ts
this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
// Deep copy nested properties:
if (!this.settings.nested) {
  this.settings.nested = { ...DEFAULT_SETTINGS.nested };
}
```

Or use a deep merge utility for complex nested structures.

## Listener Cleanup

**Problem**: Not using `registerEvent()`, `registerDomEvent()`, or `registerInterval()` causes memory leaks when the plugin unloads.

**Wrong**:
```ts
onload() {
  this.app.workspace.on("file-open", this.handleFileOpen); // Not registered!
  window.addEventListener("resize", this.handleResize); // Not registered!
  setInterval(this.updateStatus, 1000); // Not registered!
}
```

**Correct**:
```ts
onload() {
  this.registerEvent(this.app.workspace.on("file-open", this.handleFileOpen));
  this.registerDomEvent(window, "resize", this.handleResize);
  this.registerInterval(setInterval(this.updateStatus, 1000));
}
```

All registered events/intervals are automatically cleaned up when the plugin unloads.

## Settings Not Updating UI

**Problem**: Changing settings but the settings tab UI doesn't reflect the change.

**Solution**: Call `display()` after updating settings that affect the UI:

```ts
new Setting(containerEl)
  .setName("Toggle setting")
  .addToggle((toggle) =>
    toggle
      .setValue(this.plugin.settings.enabled)
      .onChange(async (value) => {
        this.plugin.settings.enabled = value;
        await this.plugin.saveSettings();
        this.display(); // Re-render settings tab
      })
  );
```

## View Management

**Source**: Warning from `.ref/obsidian-plugin-docs/docs/guides/custom-views.md`

**Problem**: Storing references to views causes issues because Obsidian may call the view factory function multiple times.

**Wrong**:
```ts
let myView: MyView; // Don't store view references!

onload() {
  this.registerView(VIEW_TYPE_MY_VIEW, (leaf) => {
    myView = new MyView(leaf); // BAD: Storing reference
    return myView;
  });
}
```

**Correct**: Always use `getLeavesOfType()` to access views:

```ts
onload() {
  this.registerView(VIEW_TYPE_MY_VIEW, (leaf) => new MyView(leaf));
}

// Access views when needed:
const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MY_VIEW);
leaves.forEach((leaf) => {
  if (leaf.view instanceof MyView) {
    // Access view instance
  }
});
```

## Mobile vs Desktop APIs

**Problem**: Using desktop-only APIs without setting `isDesktopOnly: true` in `manifest.json`.

**Solution**: 
- Check if an API is desktop-only in `.ref/obsidian-api/obsidian.d.ts`
- Set `isDesktopOnly: true` in `manifest.json` if using Node.js/Electron APIs
- Or use feature detection and provide mobile alternatives

**Example**: Status bar items don't work on mobile. Check before using:
```ts
// Status bar is desktop-only
if (this.app.isMobile) {
  // Use alternative UI for mobile
} else {
  const statusBarItemEl = this.addStatusBarItem();
  statusBarItemEl.setText("Status");
}
```

## TypeScript Strict Mode

**Problem**: Common type errors when using strict TypeScript.

**Common issues**:
- `Object.assign()` may not satisfy strict null checks - use proper typing
- Event handlers may have `undefined` types - add null checks
- Settings may be `undefined` on first load - provide defaults

**Solution**: Always provide proper defaults and type guards:

```ts
interface MySettings {
  value: string;
}

const DEFAULT_SETTINGS: MySettings = {
  value: "",
};

async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  // Now this.settings.value is always defined
}
```

## Command ID Stability

**Problem**: Changing command IDs after release breaks user keybindings.

**Solution**: Use stable command IDs. Once released, never change them. If you need to rename, keep the old ID and add a new one, or use aliases.

## Forgetting to Clean Up Views

**Problem**: Views remain in workspace after plugin unloads.

**Solution**: Always detach views in `onunload()`:

```ts
async onunload() {
  this.app.workspace.detachLeavesOfType(VIEW_TYPE_MY_VIEW);
}
```

## main.ts File Location

**Problem**: Having `main.ts` in both the project root AND `src/` directory, which causes build confusion and errors.

**Acceptable** (simple plugins):
```
project-root/
  main.ts           # ✅ OK for very simple plugins (like sample plugin template)
  manifest.json
```

**Also Acceptable** (recommended for most plugins):
```
project-root/
  src/
    main.ts         # ✅ Recommended for plugins with multiple files
    settings.ts
    commands/
```

**Wrong** (duplicate - causes build errors):
```
project-root/
  main.ts           # ❌ Don't have it in both places
  src/
    main.ts         # ❌ This causes build confusion and errors
```

**Why this matters**:
- Having `main.ts` in both locations causes ambiguity - build tools don't know which one to use
- This leads to build errors, confusion about which file is being compiled
- The compiled `main.js` output goes to the root, but you should have only ONE source `main.ts`

**Solution**: 
- For simple plugins: Keep `main.ts` in root (like the sample plugin template)
- For plugins with multiple files: Move `main.ts` to `src/` and organize all source files there
- **Never have `main.ts` in both locations** - choose one location and stick with it
- If you see `main.ts` in both places, remove one (preferably keep it in `src/` for better organization)

## Settings Not Persisting

**Problem**: Settings appear to save but don't persist after restart.

**Common causes**:
1. Not awaiting `saveData()`
2. Settings object structure changed (old data doesn't match new interface)
3. Settings file is corrupted or locked

**Solution**: 
- Always await `saveData()`
- Use migration logic if settings structure changes
- Handle errors when loading settings:

```ts
async loadSettings() {
  try {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  } catch (error) {
    console.error("Failed to load settings:", error);
    this.settings = { ...DEFAULT_SETTINGS };
  }
}
```

