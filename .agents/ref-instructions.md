<!--
Source: Project-specific instructions
Last synced: See sync-status.json for authoritative sync dates
Update frequency: Update as reference management strategy evolves
Applicability: Both
-->

# .ref Folder Instructions

## Purpose

The `.ref` folder is a **gitignored directory** that uses **symlinks** to reference materials, documentation, and repositories. It acts as a "portal" to other locations on your computer, not a storage location itself.

**Key Concept**: The `.ref` folder should contain **symlinks** (not actual files) pointing to:
- **Global references** (like `obsidian-api`) → symlink to a central location (e.g., `C:\Users\david\Development\.ref`)
- **Local projects** you're developing → symlink to your working copy (e.g., `../my-other-plugin`)
- **External repos** → clone to central location first, then symlink

## Important: What Happens When Someone Clones This Repo?

**The `.ref` folder is gitignored**, so symlinks are **not committed** to the repository. When someone clones this repo:

1. The `.ref` folder will be **empty or missing**
2. They need to **set up their own symlinks** following the instructions below
3. They can either:
   - **Option A**: Set up a central `.ref` location and symlink to it (recommended for multiple projects)
   - **Option B**: Clone repos directly into `.ref` folder (simpler, but less efficient for multiple projects)

This is intentional - each developer manages their own reference setup based on their directory structure.

## Folder Organization

The `.ref` folder structure (via symlinks) should be organized as follows:

### Core Obsidian References (Always Relevant)

These 5 projects are **always relevant** for any Obsidian plugin or theme project. They should be symlinked in **every** project's `.ref` folder:

- **Root level**: Base Obsidian repositories (API, official docs, sample projects)
  - `obsidian-api/` → symlink to central location
  - `obsidian-sample-plugin/` → symlink to central location
  - `obsidian-developer-docs/` → symlink to central location
  - `obsidian-plugin-docs/` → symlink to central location
  - `obsidian-sample-theme/` → symlink to central location

### Project-Specific References (Optional, Project-Dependent)

These are **only relevant** to specific projects. They should be documented in `project-context.md` for each project that uses them:

- **`plugins/`**: Community plugins relevant to this specific project
  - Example: `.ref/plugins/some-community-plugin/` → symlink to central location or working copy
  - **Note**: Only add plugins that are specifically relevant to this project's development

- **`themes/`**: Community themes relevant to this specific project
  - Example: `.ref/themes/some-community-theme/` → symlink to central location or working copy
  - **Note**: Only add themes that are specifically relevant to this project's development

**Important**: The general `.agents` documentation focuses on the 5 core Obsidian projects. Project-specific plugins and themes should be documented in `project-context.md` for each project.

## For AI Agents

**IMPORTANT**: When the user asks you to reference something in `.ref`, actively search for it. The `.ref` folder may be hidden by default in some file explorers, but it exists in the project root. Use tools like `list_dir`, `glob_file_search`, or `read_file` to access `.ref` contents.

**Organization to remember**:
- **Core Obsidian repos** (always relevant) are in `.ref/` root (e.g., `.ref/obsidian-api/`)
- **Project-specific plugins** (only if relevant to this project) are in `.ref/plugins/` (e.g., `.ref/plugins/plugin-name/`)
- **Project-specific themes** (only if relevant to this project) are in `.ref/themes/` (e.g., `.ref/themes/theme-name/`)

**When adding references**:
- **External repos** (GitHub, GitLab, etc.) → Clone to `../.ref/` (global location), then create symlink in project's `.ref/`
- **Local projects** (projects you're developing) → Create symlink directly in project's `.ref/` pointing to the local project (don't clone to global)

If you cannot find `.ref` initially, try:
- Listing the root directory with hidden files enabled
- Using `glob_file_search` with pattern `.ref/**`
- Directly reading files with paths like `.ref/obsidian-api/README.md` or `.ref/plugins/plugin-name/main.ts`

### Checking for Updates to Reference Repos

**When the user asks about updates** (e.g., "are there any updates to the hider plugin repo?" or "check for updates to obsidian-api"):

1. **Search for the repo**:
   - For plugins: Search `.ref/plugins/` for matching names (use fuzzy matching - "hider" might match "hider-plugin", "obsidian-hider", etc.)
   - For themes: Search `.ref/themes/` for matching names
   - For base Obsidian repos: Check `.ref/` root (obsidian-api, obsidian-sample-plugin, etc.)

2. **Check for updates** (read-only operations are safe):
   ```bash
   # Navigate to the repo
   cd .ref/plugins/hider-plugin  # or whatever the actual folder name is
   
   # Fetch latest changes (read-only, safe)
   git fetch
   
   # Check what's new (compare local vs remote)
   git log HEAD..origin/main --oneline  # or origin/master, depending on default branch
   
   # Or see recent commits
   git log --oneline -10
   ```

3. **Report findings**:
   - If updates are available, show what changed (use `git log` or `git diff`)
   - Ask if the user wants to pull the updates
   - **Never automatically pull** - always ask first (see [agent-dos-donts.md](agent-dos-donts.md))

4. **If repo not found**:
   - List what's available in `.ref/plugins/` or `.ref/themes/`
   - Suggest adding it if it's not there yet (see "Adding Project-Specific References" section)

## First Time Setup

The goal is to have **one central `.ref` directory** on your computer that contains all external repos, and each project's `.ref` folder contains **symlinks** pointing to that central location. This avoids duplicating repos across projects.

### Step 1: Set Up Central Reference Location (One-Time, Per Computer)

**Choose a central location** for all your Obsidian reference repos. This should be **outside** of any individual project folder. Common locations:
- Windows: `C:\Users\YourName\Development\.ref` or `C:\Development\.ref`
- macOS/Linux: `~/Development/.ref` or `/opt/ref`

**Clone the 5 core Obsidian projects once** to this central location:

```bash
# Navigate to your chosen central location
cd ~/Development  # or C:\Users\YourName\Development on Windows
mkdir .ref
cd .ref

# Clone all 5 core projects (one-time setup)
git clone https://github.com/obsidianmd/obsidian-api.git obsidian-api
git clone https://github.com/obsidianmd/obsidian-sample-plugin.git obsidian-sample-plugin
git clone https://github.com/obsidianmd/obsidian-developer-docs.git obsidian-developer-docs
git clone https://github.com/obsidianmd/obsidian-plugin-docs.git obsidian-plugin-docs
git clone https://github.com/obsidianmd/obsidian-sample-theme.git obsidian-sample-theme
```

**Note**: You only do this once per computer. All your projects will symlink to this central location.

### Step 2: Create Symlinks in Each Project

**For each Obsidian project**, create symlinks pointing to your central location. The easiest way is to use the setup script:

**Windows**: Run `setup-ref-links.bat` from the project root
**macOS/Linux**: Run `./setup-ref-links.sh` from the project root

**Or manually** (if you prefer):

```bash
# From your project root, create .ref directory
mkdir .ref

# Windows (PowerShell - adjust path to your central .ref):
# If your central .ref is at C:\Users\YourName\Development\.ref
# and your project is at C:\Users\YourName\Development\my-plugin:
cmd /c mklink /J .ref\obsidian-api ..\.ref\obsidian-api
cmd /c mklink /J .ref\obsidian-sample-plugin ..\.ref\obsidian-sample-plugin
cmd /c mklink /J .ref\obsidian-developer-docs ..\.ref\obsidian-developer-docs
cmd /c mklink /J .ref\obsidian-plugin-docs ..\.ref\obsidian-plugin-docs
cmd /c mklink /J .ref\obsidian-sample-theme ..\.ref\obsidian-sample-theme

# macOS/Linux (adjust path to your central .ref):
# If your central .ref is at ~/Development/.ref
# and your project is at ~/Development/my-plugin:
ln -s ../.ref/obsidian-api .ref/obsidian-api
ln -s ../.ref/obsidian-sample-plugin .ref/obsidian-sample-plugin
ln -s ../.ref/obsidian-developer-docs .ref/obsidian-developer-docs
ln -s ../.ref/obsidian-plugin-docs .ref/obsidian-plugin-docs
ln -s ../.ref/obsidian-sample-theme .ref/obsidian-sample-theme
```

**Important**: Adjust the relative path (`../.ref`) based on where your project is relative to your central `.ref` location. If they're in different directory structures, use absolute paths.

**Easiest method**: Use the setup scripts in the `scripts/` folder:
- **Windows**: `scripts\setup-ref-links.bat` or `.\scripts\setup-ref-links.ps1`
- **macOS/Linux**: `./scripts/setup-ref-links.sh`

These scripts will automatically detect your central `.ref` location and create all the symlinks for you.

## Updating References (Optional)

**Note**: Updates are **optional**. The reference materials work fine with whatever version was cloned initially. Most users never need to update. Only update if you want the latest documentation.

**Update all references at once** from your central location:

```bash
# Navigate to the central location (adjust path as needed)
cd ../.ref  # or cd ~/Development/.ref

# Pull updates for all repos
cd obsidian-api && git pull && cd ..
cd obsidian-sample-plugin && git pull && cd ..
cd obsidian-developer-docs && git pull && cd ..
cd obsidian-plugin-docs && git pull && cd ..
cd obsidian-sample-theme && git pull && cd ..
```

All plugin projects using symlinks will immediately see the updated content.

### Benefits

- **Single source of truth**: One clone that all projects reference
- **Easy updates**: One `git pull` updates all projects
- **Disk space efficient**: No duplicate clones
- **Works with Git**: Symlinks are transparent to Git operations
- **Flexibility**: Can also symlink to local projects you're developing

### Common Reference Repositories

**Core Obsidian Repositories (Always Relevant - Root Level)**:
These 5 projects should be symlinked in **every** Obsidian plugin/theme project:
- `obsidian-api`: Official Obsidian API documentation and type definitions
- `obsidian-sample-plugin`: Template plugin with best practices (contains `AGENTS.md` to sync from)
- `obsidian-developer-docs`: Source vault for docs.obsidian.md (official documentation)
- `obsidian-plugin-docs`: Plugin-specific documentation and guides
- `obsidian-sample-theme`: Theme template (useful for organizational patterns)

**Project-Specific References (Optional - Organized in Subfolders)**:
These are only relevant to specific projects and should be documented in `project-context.md`:
- `plugins/`: Add community plugins here **only if they're relevant to this specific project**
- `themes/`: Add community themes here **only if they're relevant to this specific project**

**To add a community plugin or theme** (maintains single source of truth):

**Step 1**: Clone to central location:
```bash
# Navigate to central .ref location (adjust path as needed)
cd ../.ref/plugins  # or cd ~/Development/.ref/plugins
git clone https://github.com/username/plugin-name.git plugin-name

# For a theme
cd ../.ref/themes  # or cd ~/Development/.ref/themes
git clone https://github.com/username/theme-name.git theme-name
```

**Step 2**: Create symlink in your project:
```bash
# From your project root
# Create subdirectories if needed
mkdir -p .ref/plugins .ref/themes

# Windows:
cmd /c mklink /J .ref\plugins\plugin-name ..\.ref\plugins\plugin-name
cmd /c mklink /J .ref\themes\theme-name ..\.ref\themes\theme-name

# macOS/Linux:
ln -s ../../.ref/plugins/plugin-name .ref/plugins/plugin-name
ln -s ../../.ref/themes/theme-name .ref/themes/theme-name
```

**Note**: See [sync-procedure.md](sync-procedure.md) for the standard procedure to keep `.agents` content synchronized with updates from these repositories.

## Adding Additional References

When you want to add more references (plugins, themes, or other projects), choose the method based on your use case:

### Option A: External Repository (Add to Global .ref)

**Use when**: Referencing an external repository (GitHub, GitLab, etc.) that you want to check for updates periodically. 

**Important distinction**:
- **Core Obsidian projects** (the 5 always-relevant ones) → Always add to global `.ref` and symlink in **every** project
- **Project-specific plugins/themes** → Add to global `.ref` but **only symlink in projects that need them**. Document in `project-context.md`.

**Workflow**: 
1. **Check if already exists**: If the repo is already in `../.ref/`, skip to step 2
2. **Clone to global location**: Clone to `../.ref/` (or `../.ref/plugins/` or `../.ref/themes/` as appropriate)
3. **Create symlink in project**: Create symlink in this project's `.ref/` folder pointing to the global location
4. **Document if project-specific**: If it's project-specific, document it in `project-context.md`

This maintains a single source of truth - one clone in the global location that projects can reference as needed.

**Step 1: Clone to central location** (your global `.ref` folder)
```bash
# Navigate to your central .ref location (e.g., C:\Users\david\Development\.ref)
# For a community plugin
cd ../.ref/plugins  # or cd ~/Development/.ref/plugins
git clone https://github.com/username/plugin-name.git plugin-name

# For a community theme
cd ../.ref/themes  # or cd ~/Development/.ref/themes
git clone https://github.com/username/theme-name.git theme-name

# For other external projects (root level)
cd ../.ref  # or cd ~/Development/.ref
git clone https://github.com/username/repo-name.git repo-name
```

**Step 2: Create symlink in this project**
```bash
# From your project root
# Create subdirectories if needed
mkdir -p .ref/plugins .ref/themes

# Windows (adjust path to your central .ref location):
cmd /c mklink /J .ref\plugins\plugin-name ..\.ref\plugins\plugin-name
cmd /c mklink /J .ref\themes\theme-name ..\.ref\themes\theme-name
cmd /c mklink /J .ref\repo-name ..\.ref\repo-name

# macOS/Linux (adjust path to your central .ref location):
ln -s ../../.ref/plugins/plugin-name .ref/plugins/plugin-name
ln -s ../../.ref/themes/theme-name .ref/themes/theme-name
ln -s ../.ref/repo-name .ref/repo-name
```

**Benefits**: 
- Single source of truth - one clone in central location
- Can check for updates with `git pull` in central location
- All projects using symlinks see updates immediately
- Full Git history available
- Disk space efficient

**To check for updates later**:
```bash
# Update in central location (adjust path as needed)
cd ../.ref/plugins/plugin-name  # or cd ~/Development/.ref/plugins/plugin-name
git pull

# All projects with symlinks to this repo will immediately see the updates
```

### Option B: Local Project You're Developing (Symlink to Working Copy)

**Use when**: You're actively developing another project alongside this one and want to see changes in real-time. This should **NOT** be added to your global `.ref` - it should symlink directly to your working copy.

**Workflow**: 
1. **Create symlink directly**: Create a symlink directly from this project's `.ref/` folder to your working copy (e.g., `../my-other-plugin`)
2. **Do NOT clone**: Do not clone this to the global `.ref/` location - it's project-specific
3. **Document**: Document it in `project-context.md` if it's relevant to this project

This references your active development work, not a reference copy. Changes are immediately visible.

```bash
# From your project root
# Create subdirectories if needed
mkdir -p .ref/plugins .ref/themes

# Windows (adjust path to your working copy):
# Example: If you're in Development/my-plugin and want to reference Development/my-other-plugin:
cmd /c mklink /J .ref\plugins\my-other-plugin ..\my-other-plugin
cmd /c mklink /J .ref\themes\my-theme ..\my-theme
cmd /c mklink /J .ref\project-name ..\project-name

# macOS/Linux (adjust path to your working copy):
ln -s ../my-other-plugin .ref/plugins/my-other-plugin
ln -s ../my-theme .ref/themes/my-theme
ln -s ../project-name .ref/project-name
```

**Note**: 
- Adjust the relative path (`../`) based on your directory structure
- If your projects are in `Development/`, and you're in `Development/my-plugin`, use `../` to go up one level
- For absolute paths: `cmd /c mklink /J .ref\project-name C:\Users\david\Development\project-name` (Windows) or `ln -s ~/Development/project-name .ref/project-name` (Unix)

**Benefits**:
- References your active working copy (not a duplicate)
- Changes in your working copy are immediately visible
- Perfect for projects you're actively developing alongside this one
- No need to clone or copy - just symlink to where you're already working

**Note**: With symlinks, any changes you make to the original project are immediately visible in `.ref/project-name/` - no need to pull or sync. This is different from Option A, which clones to the central `.ref` location first.


### Quick Decision Guide

- **5 Core Obsidian projects** (obsidian-api, obsidian-sample-plugin, obsidian-developer-docs, obsidian-plugin-docs, obsidian-sample-theme) → **Always** clone to global `.ref` and symlink in **every** project
- **External repository** (GitHub, GitLab, etc.) that's project-specific → Use **Option A** - Clone to your **global/central `.ref` location**, then symlink **only in projects that need it**. Document in `project-context.md`.
- **Local project you're actively developing** → Use **Option B** - Symlink directly to your working copy (e.g., `../project-name`). **Do NOT** add to global `.ref` - this is project-specific. Document in `project-context.md`.

### Quick Workflow

1. **Decide which option** based on your use case (see above)
2. **Add to `.ref`** using the appropriate method:
   - **Option A (External)**: Clone to your **global `.ref` location** (e.g., `C:\Users\david\Development\.ref`) first, then create symlink in this project's `.ref/`
   - **Option B (Local)**: Create symlink directly from this project's `.ref/` to your working copy (e.g., `../project-name`)
   - **Plugins/Themes**: Use `plugins/` or `themes/` subfolders for organization
3. **Reference in your work** - AI agents can now access it via:
   - `.ref/plugins/plugin-name/` for plugins
   - `.ref/themes/theme-name/` for themes
   - `.ref/project-name/` for other projects
4. **Update as needed**:
   - **Option A (External)**: `cd ../.ref/plugins/plugin-name && git pull` (updates in global location - all projects with symlinks see updates immediately)
   - **Option B (Local)**: Changes automatically visible - no action needed (you're working directly on the source)

## Summary: Key Concepts

1. **`.ref` folder is gitignored** - Symlinks are not committed to the repository
2. **5 Core Obsidian projects** (obsidian-api, obsidian-sample-plugin, obsidian-developer-docs, obsidian-plugin-docs, obsidian-sample-theme) are **always relevant** for any Obsidian project → Clone to central location (e.g., `C:\Users\david\Development\.ref`), then symlink in **every** project
3. **Project-specific plugins/themes** are **only relevant** to specific projects → Document in `project-context.md`, symlink only in projects that need them
4. **Local projects** you're developing → Symlink directly to working copy (don't add to global `.ref`)
5. **External repos** → Clone to global `.ref` location first, then symlink in projects
6. **When someone clones this repo** → They need to set up their own symlinks (the `.ref` folder will be empty)

### Example Directory Structure

```
C:\Users\david\Development\
├── .ref\                          # Global reference location (one-time setup)
│   ├── obsidian-api\              # Core (always relevant)
│   ├── obsidian-sample-plugin\    # Core (always relevant)
│   ├── obsidian-developer-docs\   # Core (always relevant)
│   ├── obsidian-plugin-docs\      # Core (always relevant)
│   ├── obsidian-sample-theme\     # Core (always relevant)
│   ├── plugins\                    # Project-specific (only if needed)
│   │   └── some-community-plugin\
│   └── themes\                     # Project-specific (only if needed)
│       └── some-community-theme\
│
└── obsidian-sample-plugin\        # Your project
    └── .ref\                       # Symlinks only (gitignored)
        ├── obsidian-api → ..\.ref\obsidian-api                    # Core (always)
        ├── obsidian-sample-plugin → ..\.ref\obsidian-sample-plugin # Core (always)
        ├── obsidian-developer-docs → ..\.ref\obsidian-developer-docs # Core (always)
        ├── obsidian-plugin-docs → ..\.ref\obsidian-plugin-docs     # Core (always)
        ├── obsidian-sample-theme → ..\.ref\obsidian-sample-theme   # Core (always)
        ├── plugins\                                                # Project-specific
        │   └── some-community-plugin → ..\.ref\plugins\some-community-plugin
        └── my-other-plugin → ..\my-other-plugin  # Local project symlink
```

### Notes

**Windows**:
- Directory junctions (`mklink /J`) are preferred over symbolic links (`mklink /D`) for directories
- Junctions require administrator privileges or Developer Mode enabled in Windows 10/11
- Use forward slashes in paths when possible, or backslashes for Windows-specific commands

**macOS/Linux**:
- Use `ln -s` to create symbolic links
- Ensure you have write permissions in the target directory

**Path Tips**:
- Use relative paths (e.g., `../.ref`) when possible for portability
- Adjust paths based on your directory structure
- If your central `.ref` is at a different location, use absolute paths (e.g., `~/Development/.ref` on Unix, or adjust relative paths accordingly)

**General**:
- The `.ref` folder should be added to `.gitignore` (see project `.gitignore`)


