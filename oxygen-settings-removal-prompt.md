# Prompt for Removing UI Hiding Features from Oxygen Settings Plugin

## Context
All UI hiding/showing features have been migrated to the **UI Tweaker** plugin. The Oxygen Settings plugin should remove all related features to avoid duplication and conflicts.

## IMPORTANT: Features to KEEP (DO NOT REMOVE)
These features are **NOT** in UI Tweaker and should remain in Oxygen Settings:
- **Focus mode** (`focusMode`) - UI Tweaker does not have this feature
- **Deemphasize properties** (`deemphasizeProperties`) - UI Tweaker does not have this feature
- **Auto-hide tab bar when single tab** (`autoHideTabBarWhenSingleTab`) - UI Tweaker does not have this feature
- **Hide vault name** (`hideVault`) - UI Tweaker does not have this (it was integrated into vault switcher visibility)

## Features to REMOVE

### 1. Auto-hide Features (Meridian Style)
Remove all auto-hide toggle settings and their related code:
- `hideTitleBarOnHover` - Auto-hide title bar
- `autoHideFileExplorerNavHeader` - Auto-hide file explorer nav header
- `autoHideOtherNavHeaders` - Auto-hide other nav headers
- `autoHideLeftTabHeaders` - Auto-hide left tab headers
- `autoHideRightTabHeaders` - Auto-hide right tab headers
- `autoCollapseRibbon` - Auto-collapse ribbon
- `autoHideVaultSwitcher` - Auto-hide vault switcher
- `autoHideVaultSwitcherBgTransparency` - Vault switcher background transparency slider
- `autoHideSettingsButton` - Auto-hide settings button

### 2. Vault Profile Area
Remove:
- `hideHelpButton` - Hide help button (simple toggle)
- `helpButtonReplacement` - Replace help button with custom action (entire feature including command picker and icon picker)

### 3. Navigation & Tabs
Remove:
- `hideTabs` - Hide tab bar
- `hideFileNavButtons` - Hide file explorer buttons (this was redundant in UI Tweaker, but remove it from Oxygen Settings)
- `hideTabListIcon` - Hide tab list icon
- `hideNewTabIcon` - Hide new tab icon
- `hideTabCloseButton` - Hide tab close button

### 4. Status & UI Elements
Remove:
- `hideStatus` - Hide status bar
- `hideScroll` - Hide scroll bars
- `hideLeftSidebarButton` - Hide left sidebar toggle button
- `hideRightSidebarButton` - Hide right sidebar toggle button
- `hideTooltips` - Hide tooltips

### 5. Search
Remove:
- `hideSearchSuggestions` - Hide search suggestions
- `hideSearchCounts` - Hide count of search term matches

### 6. Properties
Remove:
- `hidePropertiesReading` - Hide properties in Reading view
- `hidePropertiesHeading` - Hide properties heading
- `hideAddPropertyButton` - Hide "Add property" button

### 7. Other
Remove:
- `hideInstructions` - Hide instructions

### 8. Desktop Hide Buttons
Remove the entire "Desktop hide buttons" section:
- `hideButtonNewNote` - Hide "New note" button
- `hideButtonNewFolder` - Hide "New folder" button
- `hideButtonSortOrder` - Hide "Sort order" button
- `hideButtonAutoReveal` - Hide "Auto-reveal" button
- `hideButtonCollapseAll` - Hide "Collapse all" button
- `hideButtonReadingMode` - Hide "Reading mode" button
- `hideButtonSearchSettings` - Hide "Search settings" button

### 9. Mobile Devices
Remove the entire "Mobile devices" section:
- `hideIconMobileChevrons` - Hide "Mobile chevrons" icon
- `hideButtonMobileNavbarActionBack` - Hide "Navigate back" button
- `hideButtonMobileNavbarActionForward` - Hide "Navigate forward" button
- `hideButtonMobileNavbarActionQuickSwitcher` - Hide "Quick switcher" button
- `hideButtonMobileNavbarActionNewTab` - Hide "New tab" button
- `hideButtonMobileNavbarActionTabs` - Hide "Open tabs" button
- `hideButtonMobileNavbarActionMenu` - Hide "Ribbon menu" button
- `swapMobileNewTabIcon` - Swap mobile new tab icon

### 10. Mobile Navigation Menu
Remove the entire "Mobile navigation menu" section:
- `orderNavbarButton1` - "Navigate back" button position
- `orderNavbarButton2` - "Navigate forward" button position
- `orderNavbarButton3` - "Quick switcher" button position
- `orderNavbarButton4` - "New tab" button position
- `orderNavbarButton5` - "Open tabs" button position
- `orderNavbarButton6` - "Ribbon menu" button position

### 11. Deprecated Settings
Remove these deprecated settings if they still exist:
- `hideSidebarButtons` - Deprecated (use hideLeftSidebarButton and hideRightSidebarButton)
- `collapseFileExplorerButtons` - Deprecated (use autoHideFileExplorerNavHeader and collapseOtherNavHeaders)
- `collapseOtherNavHeaders` - This was a separate feature from auto-hide, but if it's not in UI Tweaker, consider removing it

## Files to Modify

### 1. Settings Interface (`src/settings/settings-interface.ts`)
- Remove all the settings properties listed above from `MinimalSettings` interface
- Remove them from `DEFAULT_SETTINGS` object
- Remove `HelpButtonReplacementSettings` interface (if it's only used for help button replacement)

### 2. Hider Settings Section (`src/settings/sections/HiderSettings.ts`)
- Remove the entire file OR remove all the settings UI code for the features listed above
- Keep only "Focus mode" if the file is kept

### 3. Style Manager (`src/managers/style-manager.ts`)
- Remove all CSS class application logic for the removed features
- Remove all CSS variable setting for vault switcher transparency
- Remove help button replacement logic (updateHelpButtonCSS, updateHelpButton, setupHelpButtonObserver, restoreHelpButton methods)

### 4. Main Plugin File (`src/main.ts`)
- Remove help button replacement initialization and cleanup
- Remove help button observer setup
- Remove help button style element management
- Remove custom help button element management

### 5. CSS File (`styles.css`)
Remove all CSS rules for:
- Auto-hide features (all `auto-hide-*` classes)
- Auto-collapse ribbon (`auto-collapse-ribbon`)
- Hide help button (`hider-help-button`)
- Hide vault (`hider-vault`) - **WAIT, check if this should stay since UI Tweaker doesn't have it**
- Hide tabs (`hider-tabs`)
- Hide file nav buttons (`hider-file-nav-header` or similar)
- Hide tab icons (`hide-tab-list-icon`, `hide-new-tab-icon`, `hide-tab-close-button`)
- Hide status (`hider-status`)
- Hide scroll (`hider-scroll`)
- Hide sidebar buttons (`hider-left-sidebar-button`, `hider-right-sidebar-button`)
- Hide tooltips (`hider-tooltips`)
- Hide search suggestions (`hider-search-suggestions`)
- Hide search counts (`hider-search-counts`)
- Hide instructions (`hider-instructions`)
- Hide properties (`hider-meta`, `metadata-heading-off`, `metadata-add-property-off`)
- Desktop hide buttons (all `hide-button-*` classes)
- Mobile hide icons (`hide-icon-mobile-chevrons`)
- Mobile hide buttons (all `hide-button-mobile-navbar-action-*` classes)
- Mobile swap icon (`swap-mobile-new-tab-icon`)
- Mobile navigation menu ordering (all `order-navbar-button-nth-child-*` classes)
- Vault switcher background transparency CSS variables (`--auto-hide-vault-switcher-bg-transparency`, `--auto-hide-vault-switcher-mask`)

**KEEP CSS for:**
- Focus mode
- Deemphasize properties
- Auto-hide tab bar when single tab
- Hide vault name (if it's a separate feature from vault switcher)

### 6. Commands (`src/commands/feature-commands.ts` or similar)
- Remove all toggle commands for the removed features
- Remove help button replacement related commands

### 7. Constants (`src/constants.ts`)
- Remove any constants related to the removed features

### 8. Modals (if they exist)
- Remove `CommandPickerModal` if it's only used for help button replacement
- Remove `IconPickerModal` if it's only used for help button replacement
- **OR** keep them if they're used elsewhere in the plugin

### 9. README (`README.md`)
- Remove documentation for all removed features
- Update feature list

## Migration Notes for Users

Add a note in the README or release notes:
"All UI hiding/showing features have been moved to the **UI Tweaker** plugin. Please install UI Tweaker to continue using these features. Your settings will need to be reconfigured in the new plugin."

## Verification Checklist

After removal, verify:
- [ ] Plugin still compiles without errors
- [ ] No broken references to removed settings
- [ ] CSS doesn't reference removed classes
- [ ] Settings interface doesn't include removed properties
- [ ] Focus mode still works
- [ ] Deemphasize properties still works
- [ ] Auto-hide tab bar when single tab still works (if applicable)
- [ ] Hide vault name still works (if applicable)
- [ ] No console errors related to removed features
- [ ] Settings tab doesn't show removed options

## Important Notes

1. **Be careful with CSS**: Some CSS rules might be shared or have dependencies. Review carefully before removing.
2. **Backward compatibility**: Consider adding migration logic if users have existing settings for removed features, or simply let them know they need to reconfigure in UI Tweaker.
3. **Help button replacement**: This feature had complex logic with mutation observers. Make sure to clean up all related code including observers, style elements, and DOM manipulation.
4. **Mobile navigation ordering**: This feature used CSS classes with specific naming patterns. Remove all related CSS rules.
5. **Settings migration**: You may want to add a one-time migration that warns users about the change, but don't try to migrate settings automatically since UI Tweaker uses a different structure (Show/Hide/Reveal vs simple toggles).

## Testing

After removal:
1. Test that the plugin loads without errors
2. Test that remaining features (Focus mode, Deemphasize properties, etc.) still work
3. Verify no CSS conflicts with UI Tweaker plugin
4. Check that settings are properly saved/loaded without removed properties
5. Test on both desktop and mobile (if applicable)
