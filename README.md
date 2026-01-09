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

### Advanced Features

- Vault switcher background transparency control
- Replace help button with custom command and icon

## Commands

Each feature has a corresponding toggle command that can be bound to hotkeys:

- `UI Tweaker: Toggle title bar`
- `UI Tweaker: Toggle file explorer navigation header`
- `UI Tweaker: Toggle status bar`
- `UI Tweaker: Toggle tab bar`
- ... and many more

Toggle commands cycle between Show and Hide states. If a setting is set to "Reveal", the toggle command will reset it to "Show" first, then toggle to "Hide".

## Installation

Image Manager is not yet available in the Community plugins section. Install using [BRAT](https://github.com/TfTHacker/obsidian42-brat) or manually:

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
2. Configure each setting according to your preferences
3. Use the dropdown menus for elements that support Show/Hide/Reveal
4. Use toggle switches for simple Show/Hide options
5. Bind toggle commands to hotkeys in Settings → Hotkeys for quick access

## Compatibility

- Works on both desktop and mobile
- Compatible with Obsidian 0.15.0 and later

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
