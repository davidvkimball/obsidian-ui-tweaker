# AI Agent Instructions

This file serves as the entry point for AI agents working on Obsidian plugin or theme development projects. The detailed instructions have been organized into a structured directory for better maintainability.

**Applicability**: Each file in `.agents` is marked with its applicability:
- **Plugin** - Only relevant for plugin development
- **Theme** - Only relevant for theme development  
- **Both** - Relevant for both plugins and themes

## Quick Start

**All agent instructions are located in the [`.agents`](.agents/) directory.**

**New to this project?** Start here:
0. **Set up reference materials**: Check if `.ref` folder exists and has symlinks. If not, run the setup script:
   - **Windows**: `scripts\setup-ref-links.bat` or `.\scripts\setup-ref-links.ps1`
   - **macOS/Linux**: `./scripts/setup-ref-links.sh`
   - The script will automatically create `../.ref/` (if needed), clone the 5 core Obsidian projects, and create symlinks
1. Read [project-context.md](.agents/project-context.md) for project-specific information and overrides
2. Read [project-overview.md](.agents/project-overview.md) to understand the structure
3. Check [environment.md](.agents/environment.md) for setup requirements
4. Review [common-tasks.md](.agents/common-tasks.md) for quick code snippets
5. See [code-patterns.md](.agents/code-patterns.md) for complete examples
6. Bookmark [quick-reference.md](.agents/quick-reference.md) for common commands

**Note**: For complex projects, see `.agents/.context/` directory (optional advanced feature).

## Help: Interactive Guidance

**When the user asks for "help"** or **"what's the latest"**, present these options and guide them based on their choice:

---

### Option 0: Check for Updates / "What's the Latest"

**Present this option when**: User asks "what's the latest", "check for updates", or wants to see what's new in reference repos.

**Important**: Updates are **optional**. The reference materials work fine with whatever version was cloned initially. Most users never need to update. This is only for users who want the latest documentation.

**Instructions for AI agent**:
1. **First, ensure `.ref` folder is set up**: Check if `.ref/obsidian-api` exists. If not, run the setup script first (see Quick Start).
2. **Check for updates** (read-only, safe):
   - **For core Obsidian projects**: Check `.ref/` root (obsidian-api, obsidian-sample-plugin, obsidian-developer-docs, obsidian-plugin-docs, obsidian-sample-theme)
   - **For project-specific repos**: Check `.ref/plugins/` or `.ref/themes/` (only if documented in `project-context.md`)
3. **Use read-only git commands**:
   ```bash
   cd .ref/obsidian-api  # or other repo
   git fetch
   git log HEAD..origin/main --oneline  # Shows what's new
   ```
4. **Report findings**: Show what's new and ask if they want to pull updates
5. **Never automatically pull** - always ask first (see [agent-dos-donts.md](.agents/agent-dos-donts.md))

**Key files**: [ref-instructions.md](.agents/ref-instructions.md#checking-for-updates-to-reference-repos), [quick-sync-guide.md](.agents/quick-sync-guide.md)

---

### Option 1: Check for Updates to Reference Documentation

**Present this option when**: User wants to sync latest best practices from official Obsidian repositories, or asks about updates to any repo in `.ref`.

**Instructions for AI agent**:
1. **If user asks about a specific repo** (e.g., "are there any updates to the hider plugin repo?"):
   - **For core Obsidian projects** (obsidian-api, obsidian-sample-plugin, etc.): Check `.ref/` root
   - **For project-specific plugins/themes**: Check `.ref/plugins/` or `.ref/themes/` (only if documented in `project-context.md`)
   - Use `git fetch` and `git log` to check for updates (read-only, safe)
   - Report what's new and ask if they want to pull
   - See [ref-instructions.md](.agents/ref-instructions.md#checking-for-updates-to-reference-repos) for detailed workflow

2. **If user wants to check all official repos**:
   - Ask: "Would you like to check for updates to the core reference documentation (Sample Plugin, API, Developer Docs, etc.)?"
   - If yes, guide them through:
     - Pulling latest changes: See [quick-sync-guide.md](.agents/quick-sync-guide.md)
     - Reviewing what changed: Check git logs in `.ref/` repos (the 5 core projects)
     - Updating `.agents/` files if needed: See [sync-procedure.md](.agents/sync-procedure.md)
   - **Note**: The 5 core Obsidian projects (obsidian-api, obsidian-sample-plugin, obsidian-developer-docs, obsidian-plugin-docs, obsidian-sample-theme) are always relevant. Project-specific plugins/themes are documented in `project-context.md`.

**Key files**: [ref-instructions.md](.agents/ref-instructions.md), [quick-sync-guide.md](.agents/quick-sync-guide.md), [sync-procedure.md](.agents/sync-procedure.md)

---

### Option 2: Add a Project to Your References

**Present this option when**: User wants to reference another project (concurrent development or external reference).

**Instructions for AI agent**:
1. Ask: "Is this an external repository (GitHub, GitLab, etc.) or a local project you're actively developing?"
   
2. **If external repository**:
   - Check if it already exists in `../.ref/` (or `../.ref/plugins/` or `../.ref/themes/` as appropriate)
   - If not, clone to the global location: `cd ../.ref/plugins && git clone <URL> <name>` (adjust path as needed)
   - Create symlink in project's `.ref/` folder pointing to the global location
   - Document in `project-context.md` if it's project-specific
   
3. **If local project**:
   - Create symlink directly in project's `.ref/` folder pointing to the local project (e.g., `../my-other-plugin`)
   - **Do NOT** clone to global `.ref/` - this is project-specific
   - Document in `project-context.md` if relevant

4. **Verify**: Check that the symlink was created and works

**Key file**: [ref-instructions.md](.agents/ref-instructions.md) - See "Adding Additional References" section

---

### Option 3: Start a New Plugin or Theme Project

**Present this option when**: User wants to create a new Obsidian plugin or theme.

**Instructions for AI agent** - Follow this funnel:

1. **Initial question**: "What kind of project are you wanting to make?"
   - If **Plugin** → Go to Plugin Funnel
   - If **Theme** → Go to Theme Funnel

2. **Plugin Funnel** - Ask these questions in order:
   - "What functionality do you want your plugin to provide?" (core purpose)
   - "Will it need user settings or configuration?" → If yes, point to [commands-settings.md](.agents/commands-settings.md)
   - "What will it interact with?" (vault files, editor, UI components, workspace)
   - "Do you need any external API integrations?" → If yes, review [security-privacy.md](.agents/security-privacy.md) for guidelines
   - "Will it work on mobile, or desktop-only?" → Point to [mobile.md](.agents/mobile.md) and `isDesktopOnly` in [manifest.md](.agents/manifest.md)

3. **Theme Funnel** - Ask these questions in order:
   - "What visual style are you aiming for?" (color scheme, typography, layout)
   - "Will it support both light and dark modes?" → Point to CSS variable usage
   - "Are there specific UI elements you want to customize?" (editor, sidebar, status bar, etc.)
   - "Do you want to include theme snippets?" → Point to file structure in [file-conventions.md](.agents/file-conventions.md)

4. **After gathering answers**, guide them to:
   - [project-overview.md](.agents/project-overview.md) - Project structure
   - [environment.md](.agents/environment.md) - Setup and tooling
   - [file-conventions.md](.agents/file-conventions.md) - File organization
   - [common-tasks.md](.agents/common-tasks.md) - Code examples
   - [references.md](.agents/references.md) - Official documentation links
   - **Set up `.ref` folder**: Run the setup script (`scripts/setup-ref-links.bat`, `.ps1`, or `.sh`) to configure reference materials

**Key files**: [project-overview.md](.agents/project-overview.md), [common-tasks.md](.agents/common-tasks.md), [references.md](.agents/references.md), [ref-instructions.md](.agents/ref-instructions.md)

## Static vs. Project-Specific Files

**General `.agents` files** (most files in this directory):
- Are synced from reference repos (Sample Plugin, API, etc.)
- Should remain static and not be edited directly
- Provide general-purpose guidance for all Obsidian plugins/themes
- Can be updated by syncing from reference repositories

**Project-specific files**:
- **[project-context.md](.agents/project-context.md)** - Simple, recommended approach for most projects
  - Contains project overview, specific details, maintenance tasks, and conventions
  - Can override general `.agents` guidance when project-specific needs differ
  - Is preserved when syncing updates from reference repos
- **`.agents/.context/` directory** - Optional advanced feature for complex projects
  - Use when you need project-specific versions of multiple `.agents` files
  - Only create files that differ from general guidance
  - Structure mirrors `.agents/` directory (e.g., `.context/build-workflow.md`, `.context/code-patterns.md`)
  - Entry point: `.agents/.context/AGENTS.md` (if it exists)

**Precedence**: When conflicts exist, project-specific files take precedence over general guidance.

## Navigation

**When to use each file**:
- **Starting a new project** → See Quick Start above
- **Need to understand project structure** → [project-overview.md](.agents/project-overview.md)
- **Setting up development environment** → [environment.md](.agents/environment.md)
- **Looking for code examples** → [common-tasks.md](.agents/common-tasks.md) (quick) or [code-patterns.md](.agents/code-patterns.md) (comprehensive)
- **Troubleshooting issues** → [troubleshooting.md](.agents/troubleshooting.md) or [common-pitfalls.md](.agents/common-pitfalls.md)
- **Need a quick command reference** → [quick-reference.md](.agents/quick-reference.md)
- **Working with `.ref` folder** → [ref-instructions.md](.agents/ref-instructions.md)

### Project-Specific
- **[project-context.md](.agents/project-context.md)** - Project-specific information and overrides (simple, recommended)
- **`.context/` directory** - Optional project-specific structure for complex projects (advanced)

### Core Development
- **[project-overview.md](.agents/project-overview.md)** - Project structure, entry points, and artifacts (Plugin/Theme)
- **[environment.md](.agents/environment.md)** - Development environment and tooling (Plugin/Theme)
- **[file-conventions.md](.agents/file-conventions.md)** - File organization and folder structure (Plugin/Theme)
- **[coding-conventions.md](.agents/coding-conventions.md)** - Code standards and organization (Plugin)

### Configuration
- **[manifest.md](.agents/manifest.md)** - `manifest.json` rules and requirements (Plugin/Theme)
- **[commands-settings.md](.agents/commands-settings.md)** - Commands and settings patterns (Plugin)
- **[versioning-releases.md](.agents/versioning-releases.md)** - Versioning and GitHub release workflow (Both)

### Best Practices
- **[security-privacy.md](.agents/security-privacy.md)** - Security, privacy, and compliance guidelines (Both)
- **[ux-copy.md](.agents/ux-copy.md)** - UX guidelines and UI text conventions (Both)
- **[performance.md](.agents/performance.md)** - Performance optimization best practices (Both)
- **[mobile.md](.agents/mobile.md)** - Mobile compatibility considerations (Both)

### Development Workflow
- **[build-workflow.md](.agents/build-workflow.md)** - **CRITICAL**: Build commands to run after changes (Plugin/Theme)
- **[testing.md](.agents/testing.md)** - Testing and manual installation procedures (Plugin/Theme)
- **[common-tasks.md](.agents/common-tasks.md)** - Code examples and common patterns - expanded with settings, modals, views, status bar, ribbon icons (Plugin/Theme)
- **[code-patterns.md](.agents/code-patterns.md)** - Comprehensive code patterns for settings tabs, modals, views, file operations, workspace events (Plugin)
- **[common-pitfalls.md](.agents/common-pitfalls.md)** - Common mistakes and gotchas to avoid (Plugin)
- **[troubleshooting.md](.agents/troubleshooting.md)** - Common issues, error messages, and debugging techniques (Both)
- **[quick-reference.md](.agents/quick-reference.md)** - One-page cheat sheet for common tasks and commands (Both)
- **[agent-dos-donts.md](.agents/agent-dos-donts.md)** - Specific do's and don'ts for AI agents (Both)
- **[summarize-commands.md](.agents/summarize-commands.md)** - How to generate commit messages and release notes

### Reference Materials
- **[references.md](.agents/references.md)** - External links and resources
- **[ref-instructions.md](.agents/ref-instructions.md)** - Instructions for using the `.ref` folder
- **[sync-procedure.md](.agents/sync-procedure.md)** - Procedure for syncing content from Sample Plugin and API
- **[sync-status.json](.agents/sync-status.json)** - Central tracking of sync dates and status
- **[quick-sync-guide.md](.agents/quick-sync-guide.md)** - Quick reference for pulling updates from reference repos

## Important: .ref Folder

The `.ref` folder contains **symlinks** to reference materials (not actual files). It's gitignored and acts as a "portal" to other locations on the computer.

**For AI Agents**:
- **When first working on a project**: Check if `.ref/obsidian-api` exists. If not, run the setup script to create it
- **When asked to reference something**: Actively search for it using `list_dir`, `glob_file_search`, or `read_file`
- **When adding references**: 
  - External repos → Clone to `../.ref/` (global), then symlink in project's `.ref/`
  - Local projects → Symlink directly in project's `.ref/` (don't clone to global)
- **The `.ref` folder may be hidden** by default in file explorers, but it exists in the project root

**Setup**: The setup scripts (`scripts/setup-ref-links.*`) automatically:
1. Create `../.ref/` if it doesn't exist
2. Clone the 5 core Obsidian projects if they don't exist
3. Create `../.ref/plugins/` and `../.ref/themes/` folders
4. Create symlinks in the project's `.ref/` folder

**Philosophy**: It "just works" out of the box. The reference materials are cloned once and work indefinitely. Updates are optional and only needed if you want the latest documentation. Most users never update, and that's perfectly fine.

See [ref-instructions.md](.agents/ref-instructions.md) for complete details.

## Source Attribution

Each file in `.agents` includes a header comment with:
- Source(s) of the information
- Last sync date (for reference; see [sync-status.json](.agents/sync-status.json) for authoritative dates)
- Update frequency guidance

**Central Sync Tracking**: All sync dates are tracked centrally in [sync-status.json](.agents/sync-status.json). When syncing content, update this file with the actual current date (never use placeholder dates).

## Updating Content

Content in this directory is based on:
- **Obsidian API** (`.ref/obsidian-api/obsidian.d.ts`) - **Authoritative source** for all API information
- Obsidian Sample Plugin repository - Implementation patterns and best practices
- Obsidian Sample Theme repository - Theme patterns
- Obsidian Plugin Docs and Developer Docs - General guidance (may be outdated, always verify against API)
- Community best practices

**Important**: The `obsidian-api` repository is the authoritative source. When information conflicts between API and documentation, the API takes precedence. Always check `.ref/obsidian-api/obsidian.d.ts` first, especially for new features (e.g., `SettingGroup` since 1.11.0).

Check the source attribution in each file header for update frequency guidance. When the Obsidian Sample Plugin, Sample Theme, or API documentation is updated, relevant files here should be reviewed and updated accordingly.

**See [sync-procedure.md](.agents/sync-procedure.md) for the standard procedure to sync content from the latest Sample Plugin, Sample Theme, and API updates.**

## General Purpose / Reusable

This `.agents` directory structure and content is designed to be **general-purpose and reusable** across Obsidian plugin and theme projects. The content is based on official Obsidian repositories and documentation, not project-specific code. You can:

- Copy this structure to other Obsidian projects
- Use it as a template for new projects
- Share it with other developers
- Adapt it for your specific needs

The only project-specific content is in:
- `project-context.md` - Project-specific information and overrides (maintained by developer)
- `.context/` directory - Optional project-specific structure for complex projects (if it exists)
- `ref-instructions.md` - OS-agnostic setup instructions that may need path adjustments

Everything else syncs from official Obsidian sources.

## Troubleshooting

**If `.ref` folder is missing or empty**:
- Run the setup script: `scripts\setup-ref-links.bat` (Windows), `.\scripts\setup-ref-links.ps1` (PowerShell), or `./scripts/setup-ref-links.sh` (macOS/Linux)
- The script will automatically set everything up

**If symlinks are broken**:
- Re-run the setup script - it will recreate the symlinks

**If you can't find a reference**:
- Check [ref-instructions.md](.agents/ref-instructions.md) for organization
- Check `project-context.md` for project-specific references
- Use `list_dir` or `glob_file_search` to search `.ref/` folder

**If build fails**:
- See [build-workflow.md](.agents/build-workflow.md) for build commands
- See [troubleshooting.md](.agents/troubleshooting.md) for common issues
- See [common-pitfalls.md](.agents/common-pitfalls.md) for common mistakes

