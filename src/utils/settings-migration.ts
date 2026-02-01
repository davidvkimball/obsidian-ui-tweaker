import { UISettings } from '../settings';

/**
 * Migrates old settings properties to the new structure.
 * Returns true if any changes were made.
 */
export function migrateSettings(settings: UISettings): boolean {
    if (!settings.tabBarCommands) return false;

    let needsSave = false;
    for (const pair of settings.tabBarCommands) {
        // Check if old properties exist in the loaded data (for backward compatibility)
        const pairWithOldProps = pair as {
            mdOnly?: boolean;
            fileTypeFilter?: string;
            showOnFileTypes?: string;
            hideOnFileTypes?: string;
        };

        // Skip if already migrated
        if (pair.showOnFileTypes !== undefined || pair.hideOnFileTypes !== undefined) {
            continue;
        }

        // Migrate from mdOnly: true
        if (pairWithOldProps.mdOnly === true && !pair.showOnFileTypes) {
            pair.showOnFileTypes = 'md,mdx';
            delete pairWithOldProps.mdOnly;
            needsSave = true;
        }

        // Migrate from fileTypeFilter (old mixed syntax)
        if (pairWithOldProps.fileTypeFilter && !pair.showOnFileTypes && !pair.hideOnFileTypes) {
            const filter = pairWithOldProps.fileTypeFilter;
            const parts = filter.split(',').map(p => p.trim()).filter(p => p);
            const showTypes: string[] = [];
            const hideTypes: string[] = [];

            for (const part of parts) {
                if (part.startsWith('-')) {
                    const ext = part.slice(1).replace(/^\./, '').toLowerCase();
                    if (ext) hideTypes.push(ext);
                } else {
                    const ext = part.replace(/^\./, '').toLowerCase();
                    if (ext) showTypes.push(ext);
                }
            }

            if (showTypes.length > 0) {
                pair.showOnFileTypes = showTypes.join(',');
            }
            if (hideTypes.length > 0) {
                pair.hideOnFileTypes = hideTypes.join(',');
            }

            delete pairWithOldProps.fileTypeFilter;
            needsSave = true;
        }
    }
    return needsSave;
}
