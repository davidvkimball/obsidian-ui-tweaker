# UI Tweaker

Hide or hover-to-reveal various interface elements in Obsidian.

## Made for Vault CMS

Part of the [Vault CMS](https://github.com/davidvkimball/vault-cms) project.

## Features

UI Tweaker provides extensive control over Obsidian's interface with three visibility states:

- **Show**: Element is always visible (default)
- **Hide**: Element is always hidden
- **Reveal**: Element is hidden by default but appears on hover/interaction

### Auto-hide Elements (Show/Hide/Reveal)

- Title bar
- File explorer navigation header
- Other navigation headers (tags, backlinks, outline, bookmarks)
- Left tab headers
- Right tab headers
- Ribbon (collapse on hover)
- Vault switcher
- Help button
- Settings button

### Navigation Controls

- Tab bar
- New note button
- New folder button
- Sort order button
- Auto-reveal button
- Collapse all button
- Reading mode button
- Search settings button

### Tab Icons (Show/Hide/Reveal)

- Tab list icon
- New tab icon
- Tab close button

### Status & UI Elements

- Status bar
- Scroll bars (Show/Hide/Reveal)
- Left sidebar toggle button (Show/Hide/Reveal)
- Right sidebar toggle button (Show/Hide/Reveal)
- Tooltips
- Instructions

### Mobile Features

- Hide mobile chevrons icon
- Hide navigation buttons (back, forward, quick switcher, new tab, open tabs, ribbon menu)
- Swap mobile new tab icon with home button
- Customize mobile navigation menu button positions

### Search

- Search suggestions
- Search term counts

### Properties

- Properties in Reading view
- Properties heading
- Add property button

### Custom Command Buttons

- **Explorer Tab**: Add custom command buttons to the file explorer navigation area
  - Customize icon, color, and display name for each command
  - Toggle icon support (e.g., sun/moon for theme toggle)
  - "Use active class" option for visual state indication
  - Color customization for each button
  - Reorder buttons via drag-and-drop
  - Filter by device mode (desktop/mobile/any)
  - Markdown-only mode option

- **Tab Bar Tab**: Add custom command buttons to page headers (tab bar)
  - Same customization options as Explorer buttons
  - Automatically filters to markdown/markdownx files when configured

- **Status Bar Tab**: Unified management of existing and custom status bar items
  - Reorder status bar items via drag-and-drop
  - Hide/show individual status bar items
  - Add custom command buttons to status bar
  - Color customization for status bar items
  - Markdown-only mode option

### Native Explorer Button Controls

- Customize native explorer buttons (New note, New folder, Sort order, Auto-reveal, Collapse all)
  - Show/hide individual buttons
  - Customize button colors
  - Override button icons
  - All controls available in Explorer tab settings

### Advanced Features

- Vault switcher background transparency control
- Replace help button with custom command and icon
- Replace sync button with custom command and icon (mobile only)
- Toggle icon feature with automatic state synchronization
- Command execution interceptor for real-time button state updates

## Commands

Each feature has a corresponding toggle command that can be bound to hotkeys:

- `UI Tweaker: Toggle title bar`
- `UI Tweaker: Toggle file explorer navigation header`
- `UI Tweaker: Toggle status bar`
- `UI Tweaker: Toggle tab bar`
- ... and many more

Toggle commands cycle between Show and Hide states. If a setting is set to "Reveal", the toggle command will reset it to "Show" first, then toggle to "Hide".

## Installation

UI Tweaker is not yet available in the Community plugins section. Install using [BRAT](https://github.com/TfTHacker/obsidian42-brat) or manually:

### BRAT

1. Download the [Beta Reviewers Auto-update Tester (BRAT)](https://github.com/TfTHacker/obsidian42-brat) plugin from the [Obsidian community plugins directory](https://obsidian.md/plugins?id=obsidian42-brat) and enable it.
2. In the BRAT plugin settings, select `Add beta plugin`.
3. Paste the following: `https://github.com/davidvkimball/obsidian-ui-tweaker` and select `Add plugin`.

### Manual Installation

1. Download the latest release
2. Extract the files to your vault's `.obsidian/plugins/ui-tweaker/` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

### Development

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` to start compilation in watch mode
4. The plugin will be compiled to `main.js`

## Usage

1. Open Settings → UI Tweaker
2. Navigate through the tabs:
   - **Hider**: Auto-hide and visibility controls for UI elements
   - **Explorer**: Custom command buttons and native button controls for file explorer
   - **Tab Bar**: Custom command buttons for page headers
   - **Status Bar**: Unified management of status bar items
   - **Mobile**: Mobile-specific UI controls
3. Configure each setting according to your preferences
4. Use the dropdown menus for elements that support Show/Hide/Reveal
5. Use toggle switches for simple Show/Hide options
6. For custom command buttons:
   - Click "Add command" to add a new button
   - Customize icon, color, and display name
   - Set a toggle icon for commands with on/off states
   - Reorder buttons by dragging
7. Bind toggle commands to hotkeys in Settings → Hotkeys for quick access

## Compatibility

- Works on both desktop and mobile
- Compatible with Obsidian 0.15.0 and later

### Toggle Icon Feature Compatibility

The toggle icon feature allows command buttons to display different icons based on their toggle state (e.g., sun/moon for theme toggle). For this feature to work automatically with your plugin's commands, your command should implement a `checkCallback` function.

**For Plugin Developers:**

If your command has a toggle state (on/off), add a `checkCallback` to your command registration:

```typescript
this.addCommand({
    id: 'my-plugin:toggle-feature',
    name: 'Toggle Feature',
    icon: 'lucide-toggle-left', // Icon when off
    checkCallback: (checking: boolean) => {
        // Return true if feature is currently enabled/on
        const isEnabled = this.settings.myFeatureEnabled;
        if (checking) {
            return isEnabled;
        }
        return false;
    },
    callback: () => {
        this.settings.myFeatureEnabled = !this.settings.myFeatureEnabled;
        this.saveSettings();
    }
});
```

When a user sets a "toggle icon" for your command in UI Tweaker, the button will automatically:
- Show the default icon when `checkCallback` returns `false`
- Show the toggle icon when `checkCallback` returns `true`
- Update in real-time when the command is executed via keyboard shortcuts, command palette, or button clicks

**Commands without `checkCallback`:**

Commands without `checkCallback` will still work, but the toggle icon may not update correctly when the command is executed outside of UI Tweaker (e.g., via keyboard shortcuts). The button will update when clicked directly, but may become out of sync if the command is executed through other means.

For more information, see the [Obsidian Command API documentation](https://docs.obsidian.md/Plugins/User+interface/Commands#Command%20check%20callbacks).

## Development

This project uses TypeScript and follows Obsidian plugin best practices.

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

## Credits

- [Hider](https://github.com/kepano/obsidian-hider) - most "hide" features in this plugin are based on this plugin.
- [Commander](https://github.com/phibr0/obsidian-commander) - custom command buttons in explorer and tab bar, command execution interceptor patterns, and color picker UI patterns.
- [Status Bar Organizer](https://github.com/darlal/obsidian-statusbar-organizer) - status bar item reordering, hiding, and drag-and-drop functionality.
- [Baseline](https://github.com/aaaaalexis/obsidian-baseline) theme for the animation effects and some feature ideas.
- [Meridian](https://github.com/mvahaste/meridian) theme for the auto-hide animations for the file explorer icons and nav bar auto-hide reveal.
- [Adrenaline](https://github.com/Spekulucius/obsidian-adrenaline) theme for the auto-collapsing sidebar treatment.
- [Lumines](https://github.com/danielkhmara/obsidian-lumines) theme for the additional hiding elements logic.
