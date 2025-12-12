<!--
Source: Based on Obsidian community best practices
Last synced: See sync-status.json for authoritative sync dates
Update frequency: Review periodically for AI agent-specific guidance
Applicability: Both
-->

# Agent do/don't

**Do**
- **.ref folder setup**: When user asks to add a reference, check if it already exists first. For external repos, clone to `../.ref/` (global) then symlink in project's `.ref/`. For local projects, symlink directly in project's `.ref/` (don't clone to global). See [ref-instructions.md](ref-instructions.md) for details.
- **Plugins**: Add commands with stable IDs (don't rename once released).
- **Plugins**: Provide defaults and validation in settings.
- **Plugins**: Write idempotent code paths so reload/unload doesn't leak listeners or intervals.
- **Plugins**: Use `this.register*` helpers for everything that needs cleanup.
- **Plugins**: **Always run `npm run build` after making changes** to catch build errors early. Only check for npm installation if the build fails. See [build-workflow.md](build-workflow.md) for details.
- **Themes**: Use consistent CSS variable naming conventions.
- **Themes**: Test themes in both light and dark modes.
- **Themes**: **Always run `npx grunt build` after making changes** to catch build errors early. Only check for npm installation if the build fails. See [build-workflow.md](build-workflow.md) for details.
- **Summarize commands**: When user requests "Summarize" or "Summarize for release", follow the workflow in [summarize-commands.md](summarize-commands.md). Always read actual file changes, not just chat history.

**Don't**
- Introduce network calls without an obvious user-facing reason and documentation.
- Ship features that require cloud services without clear disclosure and explicit opt-in.
- Store or transmit vault contents unless essential and consented.
- **Themes**: Don't override core Obsidian functionality with CSS hacks that break features.
- **File structure**: Never have `main.ts` in both root AND `src/` - this causes build confusion. For simple plugins, `main.ts` in root is acceptable. For plugins with multiple files, place `main.ts` in `src/` (recommended). See [file-conventions.md](file-conventions.md) and [common-pitfalls.md](common-pitfalls.md#maints-file-location).
- **Git operations**: Never automatically commit, push, or perform any git operations. All git operations must be left to the user.
- **Git updates**: When checking for updates to repos in `.ref`, you can use read-only commands like `git fetch` and `git log` to check what's new, but **never automatically pull** - always ask the user first. See [ref-instructions.md](ref-instructions.md) for how to check for updates.


