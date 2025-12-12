<!--
Source: Based on Obsidian Developer Policies and Guidelines
Last synced: See sync-status.json for authoritative sync dates
Update frequency: Check Obsidian Developer Policies for updates
Applicability: Both
-->

# Security, privacy, and compliance

Follow Obsidian's **Developer Policies** and **Plugin Guidelines**. In particular:

- Default to local/offline operation. Only make network requests when essential to the feature.
- No hidden telemetry. If you collect optional analytics or call third-party services, require explicit opt-in and document clearly in `README.md` and in settings.
- Never execute remote code, fetch and eval scripts, or auto-update code outside of normal releases.
- Minimize scope: read/write only what's necessary inside the vault. Do not access files outside the vault.
- Clearly disclose any external services used, data sent, and risks.
- Respect user privacy. Do not collect vault contents, filenames, or personal information unless absolutely necessary and explicitly consented.
- Avoid deceptive patterns, ads, or spammy notifications.

**Plugins**: Register and clean up all DOM, app, and interval listeners using the provided `register*` helpers so the plugin unloads safely.

**Themes**: Themes are CSS-only and have minimal security surface area, but still follow privacy guidelines for any optional features.


