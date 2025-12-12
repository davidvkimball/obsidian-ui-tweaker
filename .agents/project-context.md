<!--
Source: Project-specific (not synced from reference repos)
Last updated: 2025-12-12
Applicability: Plugin

IMPORTANT: This file contains project-specific information and can override
general guidance in other .agents files. When syncing updates from reference
repos, this file is preserved and not overwritten.
-->

# Project Context: UI Tweaker

## Project Overview

**UI Tweaker** is a comprehensive Obsidian plugin for customizing the user interface by hiding, showing, and revealing UI elements. It consolidates UI hiding/auto-hide features that were previously part of the obsidian-oxygen-settings plugin into a dedicated, focused plugin.

**Current functionality:**
- Auto-hide elements with Show/Hide/Reveal states (title bar, navigation headers, tab headers, ribbon, vault switcher, settings button, etc.)
- Simple visibility toggles for UI elements (help button, vault name, tab bar, file explorer buttons, etc.)
- Mobile-specific UI controls (hide buttons, swap icons, navigation menu positioning)
- Advanced features (vault switcher background transparency, help button replacement with custom command)
- Comprehensive command system with toggle commands for all features

## Important Project-Specific Details

- **Project Type**: Production plugin for Obsidian community
- **Purpose**: Provide comprehensive UI customization without requiring theme modifications
- **Status**: Active development
- **Architecture**: Modular structure with separate files for settings, UI management, commands, and settings tab
- **Key Dependencies**: 
  - References obsidian-oxygen-settings plugin (`.ref/plugins/obsidian-oxygen-settings`) for feature patterns
  - References obsidian-hider plugin (`.ref/plugins/obsidian-hider`) for CSS class injection patterns
  - References obsidian-oxygen theme (`.ref/themes/obsidian-oxygen`) for CSS patterns

## Maintenance Tasks

- **README.md**: Keep documentation updated with all features, commands, and usage instructions
- **Settings Interface**: When adding new features, ensure they follow the Show/Hide/Reveal pattern where applicable
- **CSS Styles**: Keep CSS selectors aligned with Obsidian's DOM structure - test after Obsidian updates
- **Command IDs**: Use stable command IDs (`ui-tweaker:toggle-{feature-name}`) - avoid renaming once released
- **Settings Keys**: Use camelCase for all settings keys, maintain consistency with existing patterns
- **Reference Projects**: Keep reference projects (oxygen-settings, hider, oxygen theme) updated to learn from their patterns

## Project-Specific Conventions

### Code Organization
- **Source files in `src/` directory**: 
  - `main.ts` - Plugin entry point and lifecycle
  - `settings.ts` - Settings interface and defaults
  - `uiManager.ts` - CSS class injection and UI state management
  - `commands.ts` - Command registration
  - `settingsTab.ts` - Settings UI implementation
  - `types.ts` - TypeScript type definitions
  - `modals/CommandPickerModal.ts` - Command selection modal

### Settings Patterns
- **Show/Hide/Reveal states**: Use `UIVisibilityState` type (`'show' | 'hide' | 'reveal'`)
- **Simple toggles**: Use `boolean` for Show/Hide only features
- **Naming**: Settings with Show/Hide/Reveal use descriptive names without "hide" prefix; simple toggles use "Hide {element}" naming

### CSS Class Naming
- Pattern: `.ui-tweaker-{feature-name}` for hide classes
- Reveal state: `.ui-tweaker-{feature-name}-reveal` for reveal-on-hover
- Apply classes to `document.body` element

### Command Naming
- Pattern: `ui-tweaker:toggle-{feature-name}`
- Toggle behavior: Show ↔ Hide (resets Reveal to Show first)
- Ribbon toggle excluded (uses base Obsidian command)

### Settings UI Organization
- **Flat list with headers** (Obsidian best practice)
- Use `containerEl.createEl('h2', { text: 'Section Name' })` for headers
- Group related settings together (e.g., all file explorer buttons)
- Use dropdowns for Show/Hide/Reveal, toggles for simple Show/Hide

## Project-Specific References

This project references specific plugins and themes that are relevant to its development. These are symlinked in `.ref/plugins/` or `.ref/themes/` as needed.

**Current project-specific references**:
- `.ref/plugins/obsidian-oxygen-settings/` - Primary source for feature implementation patterns, especially the HiderSettings.ts file
- `.ref/plugins/obsidian-hider/` - Reference for CSS class injection patterns and similar functionality
- `.ref/themes/obsidian-oxygen/` - Reference for CSS patterns and theme structure

**Note**: The 5 core Obsidian projects (obsidian-api, obsidian-sample-plugin, obsidian-developer-docs, obsidian-plugin-docs, obsidian-sample-theme) are always relevant and should be in every project's `.ref` folder. The references above are project-specific to UI Tweaker.

## Overrides (Optional)

None currently. This project follows the general `.agents` guidance.

## Key Files and Their Purposes

### Source Files (`src/`)
- `main.ts` - Main plugin class, lifecycle management, initializes UI manager and registers commands/settings
- `settings.ts` - Settings interface (`UISettings`), default values (`DEFAULT_SETTINGS`)
- `uiManager.ts` - Manages CSS class injection on `document.body`, handles reveal-on-hover functionality
- `commands.ts` - Registers all toggle commands, handles toggle logic
- `settingsTab.ts` - Implements settings UI with flat list organization and headers
- `types.ts` - TypeScript type definitions (`UIVisibilityState`, `MobileNavPosition`)
- `modals/CommandPickerModal.ts` - Modal for selecting Obsidian commands (used for help button replacement)

### Root Files
- `main.ts` - Re-exports from `src/main.ts` (entry point for esbuild)
- `manifest.json` - Plugin metadata (ID: `obsidian-ui-tweaker`)
- `styles.css` - CSS rules for hiding/showing/revealing UI elements
- `package.json` - Node.js dependencies and build scripts
- `esbuild.config.mjs` - Build configuration for TypeScript compilation
- `README.md` - Project documentation
- `oxygen-settings-removal-prompt.md` - AI prompt for removing hider features from oxygen-settings plugin

## Development Notes

### Reference Projects
- **obsidian-oxygen-settings** (`.ref/plugins/obsidian-oxygen-settings`): Primary source for feature implementation patterns, especially the HiderSettings.ts file
- **obsidian-hider** (`.ref/plugins/obsidian-hider`): Reference for CSS class injection patterns and similar functionality
- **obsidian-oxygen theme** (`.ref/themes/obsidian-oxygen`): Reference for CSS patterns and theme structure

### Feature Migration
- This plugin extracts hider/auto-hide features from obsidian-oxygen-settings
- See `oxygen-settings-removal-prompt.md` for instructions on removing these features from the oxygen-settings plugin
- Maintain feature parity where possible, but improve organization and user experience

### CSS Development
- CSS selectors must match Obsidian's DOM structure
- Test CSS after Obsidian updates as DOM structure may change
- Use reveal-on-hover patterns with `opacity` transitions for smooth UX
- Mobile-specific styles should be tested on actual mobile devices

### Settings Migration
- When users migrate from oxygen-settings, consider adding migration logic if needed
- Settings keys use camelCase to match Obsidian conventions
- Default values should be sensible (most features default to 'show' or `false`)

### Testing Considerations
- Test all three states (Show/Hide/Reveal) for applicable features
- Test toggle commands cycle correctly
- Test reveal-on-hover functionality works smoothly
- Test mobile-specific features on mobile devices
- Verify CSS doesn't conflict with themes
- Test help button replacement functionality

### Future Enhancements
- Consider adding preset support for common configurations
- Consider adding import/export settings functionality
- Monitor Obsidian API updates for new UI elements to support
- Consider adding more granular controls for individual buttons/icons

### When to Consider Using `.agents/.context/` Directory

If your project needs project-specific versions of multiple `.agents` files (e.g., custom `build-workflow.md`, `code-patterns.md`, etc.), consider creating a `.agents/.context/` directory structure. This advanced feature is optional and only needed for complex projects. See `AGENTS.md` for details on the `.context/` directory structure.

## Related Documentation

- See `oxygen-settings-removal-prompt.md` for instructions on cleaning up the oxygen-settings plugin
- Reference `.ref/plugins/obsidian-oxygen-settings/src/settings/sections/HiderSettings.ts` for original implementation patterns
- Reference `.ref/plugins/obsidian-hider/main.ts` and `styles.css` for CSS class injection patterns

