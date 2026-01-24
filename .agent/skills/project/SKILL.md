---
name: project
description: Project-specific architecture, maintenance tasks, and unique conventions for UI Tweaker.
---

# UI Tweaker Project Skill

UI Tweaker provides granular control over the Obsidian interface, allowing elements to be Shown, Hidden, or Revealed-on-hover. It centralizes UI management logic extracted from legacy theme settings into a modular, production-ready plugin.

## Core Architecture

- **State Management**: Uses `UIVisibilityState` (`'show' | 'hide' | 'reveal'`) for complex elements and `boolean` for simple toggles.
- **CSS Injection**: `uiManager.ts` injects classes onto `document.body`.
  - Hidden: `.ui-tweaker-{feature-name}`
  - Reveal: `.ui-tweaker-{feature-name}-reveal`
- **Mobile Support**: Includes specific logic for nav positioning and mobile-specific hides.
- **Status Bar Manager**: Advanced detection of status bar items from other plugins using class-based identification and text fallback (matching `obsidian-statusbar-organizer` patterns).

## Project-Specific Conventions

- **Command IDs**: Always use `ui-tweaker:toggle-{feature-name}`.
- **Settings Hierarchy**: Maintain a flat list with clear headers (`h2`) in `settingsTab.ts`.
- **CSS Selectors**: Primarily target element classes; maintain compatibility with both Desktop and Mobile DOM structures.
- **Reveal UX**: Use `opacity` transitions for smooth reveal-on-hover effects in `styles.css`.

## Key Files

- `src/main.ts`: Entry point and lifecycle orchestration.
- `src/uiManager.ts`: Core logic for managing CSS classes and visibility states.
- `src/manager/StatusBarManager.ts`: Complex status bar item identification logic.
- `src/settings.ts`: Settings interface and default value definitions.
- `styles.css`: All hiding/revealing CSS rules (heavily dependent on Obsidian DOM).

## Maintenance Tasks

- **DOM Sync**: Test CSS selectors after major Obsidian updates; the DOM structure often changes in non-obvious ways.
- **Command PICKER**: Update `modals/CommandPickerModal.ts` if Obsidian changes how commands are indexed.
- **Dependency Sync**: Maintain alignment with `.ref/plugins/obsidian-oxygen-settings` and `obsidian-hider` for cross-compatible patterns.
