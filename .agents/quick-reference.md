<!--
Source: Condensed from all reference documentation
Last synced: See sync-status.json for authoritative sync dates
Update frequency: Update as workflows evolve
Applicability: Both
-->

# Quick Reference

One-page cheat sheet for common Obsidian plugin and theme development tasks.

## Build Commands

**Plugins**:
```powershell
npm run build    # Build plugin (compile TypeScript to JavaScript)
npm run dev      # Development build with watch mode
```

**Themes**:
```powershell
npx grunt build  # Build theme (compile SCSS to CSS)
```

**Always run build after making changes** to catch errors early. See [build-workflow.md](build-workflow.md).

## File Paths

**Plugin location** (in vault):
```
<Vault>/.obsidian/plugins/<plugin-id>/
  ├── main.js          # Compiled plugin code
  ├── manifest.json    # Plugin manifest
  └── styles.css       # Plugin styles (if any)
```

**Theme location** (in vault):
```
<Vault>/.obsidian/themes/<theme-name>/
  ├── theme.css        # Compiled theme CSS
  └── manifest.json    # Theme manifest
```

**Build output**: Must be at top level of plugin/theme folder in vault.

## Common API Patterns

### Command
```ts
this.addCommand({
  id: "command-id",
  name: "Command name",
  callback: () => { /* ... */ }
});
```

### Settings Tab
```ts
class MySettingTab extends PluginSettingTab {
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName("Setting")
      .addText((text) => text.onChange(async (value) => {
        this.plugin.settings.value = value;
        await this.plugin.saveSettings();
      }));
  }
}
this.addSettingTab(new MySettingTab(this.app, this));
```

### Modal
```ts
class MyModal extends Modal {
  onOpen() { this.contentEl.setText("Content"); }
  onClose() { this.contentEl.empty(); }
}
new MyModal(this.app).open();
```

### Status Bar
```ts
const item = this.addStatusBarItem();
item.setText("Status text");
```

### Ribbon Icon
```ts
this.addRibbonIcon("icon-name", "Tooltip", () => { /* ... */ });
```

## Git Workflow

**Commit message format** (from [summarize-commands.md](summarize-commands.md)):
```
[Summary of changes]
- [detailed item 1]
- [detailed item 2]
```

**Release notes format** (markdown):
```markdown
### Release v1.2.0 - Title

### Features
- Feature description

### Improvements
- Improvement description
```

## Sync Reference Repos

**Quick pull all repos** (from [quick-sync-guide.md](quick-sync-guide.md)):
```bash
# Navigate to central .ref location (adjust path as needed)
cd ../.ref  # or cd ~/Development/.ref

# Pull all repos
cd obsidian-api && git pull && cd ..
cd obsidian-sample-plugin && git pull && cd ..
cd obsidian-developer-docs && git pull && cd ..
cd obsidian-plugin-docs && git pull && cd ..
cd obsidian-sample-theme && git pull && cd ..
```

## API Authority

**Always check `.ref/obsidian-api/obsidian.d.ts` first** - it's the authoritative source. Plugin docs and developer docs may be outdated.

## Testing

**Manual installation**:
1. Build plugin/theme
2. Copy to vault `.obsidian/plugins/` or `.obsidian/themes/`
3. Enable in Obsidian settings
4. Reload Obsidian (Ctrl+R / Cmd+R)

See [testing.md](testing.md) for details.

## Common File Structure

**Plugin**:
```
src/
  main.ts
  settings.ts
  commands/
  ui/
manifest.json
package.json
```

**Theme**:
```
src/
  main.scss
  variables.scss
theme.css
manifest.json
```

See [file-conventions.md](file-conventions.md) for details.

