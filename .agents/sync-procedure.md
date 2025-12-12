<!--
Source: Project-specific procedure
Last synced: See sync-status.json for authoritative sync dates
Update frequency: Update as sync process evolves
Applicability: Both
-->

# Sync Procedure: Keeping .agents Up to Date

**Sync Tracking**: All sync dates are tracked centrally in [sync-status.json](sync-status.json). Always update this file with the actual current date when syncing (use `Get-Date -Format "yyyy-MM-dd"` to get the date - never use placeholder dates).

This document outlines the standard procedure for keeping the `.agents` directory content synchronized with the latest updates from:
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin) - Template plugin with best practices
- [Obsidian API](https://github.com/obsidianmd/obsidian-api) - Official API documentation and type definitions
- [Obsidian Developer Docs](https://github.com/obsidianmd/obsidian-developer-docs) - Source vault for docs.obsidian.md
- [Obsidian Plugin Docs](https://github.com/obsidianmd/obsidian-plugin-docs) - Plugin-specific documentation
- [Obsidian Sample Theme](https://github.com/obsidianmd/obsidian-sample-theme) - Theme template (for reference patterns)

## Prerequisites

1. **Set up reference repositories** (see [ref-instructions.md](ref-instructions.md)):
   - Clone `obsidian-api` to `.ref/obsidian-api` (or use symlink to central location)
   - Clone `obsidian-sample-plugin` to `.ref/obsidian-sample-plugin` (or use symlink)
   - Clone `obsidian-developer-docs` to `.ref/obsidian-developer-docs` (or use symlink)
   - Clone `obsidian-plugin-docs` to `.ref/obsidian-plugin-docs` (or use symlink)
   - Optionally clone `obsidian-sample-theme` to `.ref/obsidian-sample-theme` (for theme patterns reference)

## Sync Workflow

**Before starting**: Get the current date for tracking (always use actual date, never placeholder):
```powershell
$syncDate = Get-Date -Format "yyyy-MM-dd"
Write-Host "Sync date: $syncDate"
```

### Step 1: Update Reference Repositories

Update the reference repos to get the latest content:

```bash
# If using symlinks to a central location (adjust path as needed):
cd ../.ref/obsidian-api  # or cd ~/Development/.ref/obsidian-api
git pull

cd ../obsidian-sample-plugin
git pull

cd ../obsidian-developer-docs
git pull

cd ../obsidian-plugin-docs
git pull

# Optionally update sample theme
cd ../obsidian-sample-theme
git pull

# OR if using local clones in each project:
cd .ref/obsidian-api
git pull

cd ../obsidian-sample-plugin
git pull

cd ../obsidian-developer-docs
git pull

cd ../obsidian-plugin-docs
git pull
```

### Step 2: Review Changes

Check what's changed in the reference repos:

```powershell
# Check recent commits in obsidian-api
cd .ref\obsidian-api
git log --oneline -10

# Check recent commits in obsidian-sample-plugin
cd ..\obsidian-sample-plugin
git log --oneline -10

# Check if AGENTS.md changed in sample plugin
git diff HEAD~1 HEAD -- AGENTS.md

# Check developer docs changes
cd ..\obsidian-developer-docs
git log --oneline -10

# Check plugin docs changes
cd ..\obsidian-plugin-docs
git log --oneline -10
```

### Step 3: Identify Files to Update

Based on the changes, identify which `.agents` files need updates:

- **Sample Plugin changes** → Check these files:
  - `environment.md` - Build tooling, npm scripts
  - `file-conventions.md` - File structure recommendations
  - `common-tasks.md` - Code examples
  - `testing.md` - Installation procedures
  - `versioning-releases.md` - Release workflow
  - `coding-conventions.md` - TypeScript patterns

- **API changes** → Check these files:
  - `project-overview.md` - API usage patterns
  - `commands-settings.md` - Command API changes
  - `common-tasks.md` - API usage examples
  - `references.md` - API documentation links

- **Developer Docs changes** → Check:
  - `security-privacy.md` - Policy updates
  - `manifest.md` - Manifest requirements
  - `ux-copy.md` - Style guide updates
  - `commands-settings.md` - Command documentation
  - `testing.md` - Testing procedures
  - `versioning-releases.md` - Release guidelines
  - Review `en/` directory for new or updated documentation

- **Plugin Docs changes** → Check:
  - `project-overview.md` - Plugin architecture
  - `common-tasks.md` - Plugin-specific patterns
  - `troubleshooting.md` - Common plugin issues
  - Any plugin-specific best practices

- **Sample Theme changes** (optional reference):
  - `file-conventions.md` - File organization patterns
  - `versioning-releases.md` - Release workflow similarities

### Step 4: Update .agents Files

For each file that needs updating:

1. **Read the source material**:
   - Compare `.ref/obsidian-sample-plugin/AGENTS.md` with current `.agents` files
   - Review `.ref/obsidian-api/` for API documentation changes
   - Review `.ref/obsidian-developer-docs/en/` for official documentation updates
   - Check `.ref/obsidian-plugin-docs/` for plugin-specific guidance
   - Optionally reference `.ref/obsidian-sample-theme/` for organizational patterns

2. **Update the content**:
   - Copy relevant sections from source
   - Adapt to match the topic-based structure
   - Preserve any project-specific additions

3. **Update the sync status**:
   ```powershell
   # Get the current date
   $syncDate = Get-Date -Format "yyyy-MM-dd"
   
   # Update the central sync-status.json file
   # Edit .agents/sync-status.json and update:
   # - "lastFullSync" to the current date
   # - "lastSyncSource" to describe what was synced
   # - Update relevant source repo dates in "sourceRepos"
   ```
   
   **Important**: Always use the actual current date from `Get-Date -Format "yyyy-MM-dd"`, never use placeholder dates.

4. **Note**: Individual file headers still have "Last synced" dates, but the authoritative source is `.agents/sync-status.json`. When syncing, update the central file rather than individual file headers.

### Step 5: Verify and Test

- Review updated files for accuracy
- Ensure links still work
- Check that code examples are still valid
- Verify formatting is consistent

## Quick Sync Checklist

- [ ] Pull latest from `obsidian-api` repo
- [ ] Pull latest from `obsidian-sample-plugin` repo
- [ ] Pull latest from `obsidian-developer-docs` repo
- [ ] Pull latest from `obsidian-plugin-docs` repo
- [ ] Review `AGENTS.md` in sample plugin for changes
- [ ] Review API documentation for breaking changes
- [ ] Review developer docs for policy/guideline updates
- [ ] Review plugin docs for best practices
- [ ] Update relevant `.agents/*.md` files
- [ ] **Update `.agents/sync-status.json` with actual current date** (use `Get-Date -Format "yyyy-MM-dd"` - never use placeholder dates)
- [ ] Review and commit changes

## Frequency Recommendations

- **Monthly**: Review for major updates
- **After Obsidian releases**: Check for API changes
- **When starting new features**: Verify current best practices
- **Before releases**: Ensure guidelines are current

## Automation Ideas (Future)

Consider creating a script to:
- Automatically check for updates in reference repos
- Compare `AGENTS.md` from sample plugin with current `.agents` structure
- Generate a diff report of what changed
- Remind to update "Last synced" dates

## Updating Sync Status

After completing a sync, update `.agents/sync-status.json`:

```powershell
# Get actual current date (CRITICAL: never use placeholder!)
$syncDate = Get-Date -Format "yyyy-MM-dd"

# Update sync-status.json with:
# - "lastFullSync": "$syncDate"
# - "lastSyncSource": "Description of what was synced"
# - Update relevant dates in "sourceRepos" section for repos that were checked/synced
```

**Critical**: Always use the actual date from `Get-Date -Format "yyyy-MM-dd"`. Never use placeholder dates like "YYYY-MM-DD" or hardcoded dates. The sync-status.json file is the authoritative source for all sync dates.

## Notes

- Not all changes need to be synced immediately - focus on breaking changes and new best practices
- Some content may be project-specific and shouldn't be overwritten
- Always review changes before committing to ensure they make sense for your project
- **Always update sync-status.json with the actual current date** - this is the authoritative source for sync dates


