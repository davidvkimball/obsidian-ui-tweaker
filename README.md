# UI Tweaker

A comprehensive Obsidian plugin for customizing the user interface by hiding, showing, and revealing UI elements.

## Features

UI Tweaker provides extensive control over Obsidian's interface with three visibility states:

- **Show**: Element is always visible (default)
- **Hide**: Element is always hidden
- **Reveal**: Element is hidden by default but appears on hover/interaction

### Auto-hide Elements (Show/Hide/Reveal)

- Title bar
- File explorer navigation header
- Other navigation headers (tags, backlinks, outline, etc.)
- Left tab headers
- Right tab headers
- Ribbon (uses base Obsidian toggle command)
- Vault switcher
- Settings button
- Tab bar when single tab

### Visibility Toggles (Show/Hide)

- Help button
- Vault name
- Tab bar
- File explorer buttons (all or individually)
- New note button
- New folder button
- Sort order button
- Auto reveal button
- Collapse all button
- Reading mode button
- Search settings button
- Tab list icon
- New tab icon
- Tab close button
- Status bar
- Scroll bars
- Left/Right sidebar toggle buttons
- Tooltips
- Search suggestions
- Search term counts
- Properties in Reading view
- Properties heading
- Add property button
- Instructions

### Mobile Features

- Hide mobile chevrons icon
- Hide navigation buttons (back, forward, quick switcher, new tab, open tabs, ribbon menu)
- Swap mobile new tab icon with home button
- Customize mobile navigation menu button positions

### Advanced Features

- Vault switcher background transparency control
- Replace help button with custom command

## Commands

Each feature has a corresponding toggle command that can be bound to hotkeys:

- `UI Tweaker: Toggle title bar`
- `UI Tweaker: Toggle file explorer navigation header`
- `UI Tweaker: Toggle status bar`
- `UI Tweaker: Toggle tab bar`
- ... and many more

Toggle commands cycle between Show and Hide states. If a setting is set to "Reveal", the toggle command will reset it to "Show" first, then toggle to "Hide".

## Installation

### Manual Installation

1. Download the latest release
2. Extract the files to your vault's `.obsidian/plugins/obsidian-ui-tweaker/` folder
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

## Settings Organization

Settings are organized in a flat list with headers:

- **Auto-hide elements**: Elements that support Show/Hide/Reveal states
- **Visibility toggles**: Simple Show/Hide toggles
- **File explorer buttons**: Individual button controls
- **Tab controls**: Tab-related settings
- **Sidebar controls**: Sidebar toggle buttons
- **Search and tooltips**: Search and tooltip settings
- **Properties**: Property-related settings
- **Other**: Miscellaneous settings
- **Mobile devices**: Mobile-specific settings
- **Mobile navigation menu**: Mobile button positioning
- **Advanced**: Advanced customization options

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

## License

MIT

## Credits

- [Hider](https://github.com/kepano/obsidian-hider) - most "hide" features in this plugin are based on this plugin.
- [Baseline](https://github.com/aaaaalexis/obsidian-baseline) theme for the animation effects and some feature ideas.
- [Meridian](https://github.com/mvahaste/meridian) theme for the auto-hide animations for the file explorer icons and nav bar auto-hide reveal.
- [Adrenaline](https://github.com/Spekulucius/obsidian-adrenaline) theme for the auto-collapsing sidebar treatment.
- [Lumines](https://github.com/danielkhmara/obsidian-lumines) theme for the additional hiding elements logic.
