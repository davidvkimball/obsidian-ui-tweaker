/**
 * Logic-only functions for command management, isolated from Obsidian API
 */

/**
 * Parse comma-separated file extensions and view types into arrays
 * Supports both file extensions (e.g., "md,mdx") and view types (e.g., "{{graph}},{{canvas}}")
 */
export function parseFileAndViewTypes(types: string | undefined): { fileTypes: string[]; viewTypes: string[] } {
    const result = { fileTypes: [] as string[], viewTypes: [] as string[] };

    if (!types || !types.trim()) return result;

    const parts = types.split(',').map(p => p.trim()).filter(p => p);

    for (const part of parts) {
        // Check if it's a view type (wrapped in {{}})
        const viewTypeMatch = part.match(/^\{\{(\w+)\}\}$/);
        if (viewTypeMatch) {
            result.viewTypes.push(viewTypeMatch[1].toLowerCase());
        } else {
            // It's a file extension
            const ext = part.replace(/^\./, '').toLowerCase();
            if (ext) {
                result.fileTypes.push(ext);
            }
        }
    }

    return result;
}

/**
 * Command toggle state tracker logic
 */
export class CommandToggleTracker {
    private toggleStates = new Map<string, boolean>();
    private previousStates = new Map<string, boolean>();
    private executionCounts = new Map<string, number>();

    recordExecution(id: string): void {
        const currentCount = this.executionCounts.get(id) || 0;
        this.executionCounts.set(id, currentCount + 1);
        this.toggleStates.set(id, (currentCount + 1) % 2 === 1);
    }

    getTrackedState(id: string): boolean | null {
        return this.toggleStates.get(id) ?? null;
    }

    getPreviousState(id: string): boolean | null {
        return this.previousStates.get(id) ?? null;
    }

    resetState(id: string): void {
        this.toggleStates.delete(id);
        this.previousStates.delete(id);
        this.executionCounts.delete(id);
    }

    syncState(id: string, actualState: boolean): boolean {
        const currentTrackedState = this.toggleStates.get(id);

        if (currentTrackedState !== undefined) {
            this.previousStates.set(id, currentTrackedState);
        }

        if (currentTrackedState !== actualState) {
            const currentCount = this.executionCounts.get(id) || 0;
            this.executionCounts.set(id, currentCount + 1);
            this.toggleStates.set(id, actualState);
            return true;
        }

        return false;
    }

    hasStateChanged(id: string, currentState: boolean): boolean {
        const previousState = this.previousStates.get(id);
        return previousState !== undefined && previousState !== currentState;
    }
}
