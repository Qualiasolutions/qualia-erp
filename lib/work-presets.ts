/**
 * Work presets — opt-in pseudo-projects shown at the top of an employee's
 * clock-in picker.
 *
 * Background: pre-2026-04-28 the clock-in modal hardcoded a single preset
 * (`Daily Research / Blog`) for one specific email and bound it by project
 * NAME, so renaming the project would silently break it. The 2026-04-28
 * operations diagnosis flagged this as company workflow living in code.
 *
 * This module isolates that logic behind a single config object so:
 *   - new presets can be added without changing the modal
 *   - presets bind to a stable project ID (with a name fallback for legacy)
 *   - a future admin UI can replace this constant with a DB-backed lookup
 *     (a `work_presets` table) without touching consumers
 *
 * The modal must call `getWorkPresetsForEmail()` and resolve preset → project
 * via `resolveWorkPresetProjectId()`. Treat presets as data, not code.
 */

export interface WorkPreset {
  /** Stable identifier exposed to the UI; doubles as the React key. */
  id: string;
  /** Label rendered as the project-button copy. */
  label: string;
  /** Preferred binding — UUID of the project this preset opens against. */
  boundToProjectId?: string | null;
  /**
   * Legacy binding — case-insensitive project name match. Kept so the
   * existing Moayad workflow keeps working until projects.id values are
   * pinned in this config. New presets should prefer `boundToProjectId`.
   */
  boundToProjectName?: string | null;
}

/**
 * Per-employee preset map keyed by lower-cased email. The modal reads this
 * via `getWorkPresetsForEmail` so callers never have to know the shape.
 *
 * To remove an employee's preset, delete their entry. To add a preset for a
 * new employee, append a row. Bind by `boundToProjectId` whenever possible.
 */
const WORK_PRESETS_BY_EMAIL: Record<string, WorkPreset[]> = {
  'moayad@qualiasolutions.net': [
    {
      id: 'preset:daily-research-blog',
      label: 'Daily Research / Blog',
      // Migrated from legacy hardcoded `boundToProjectName` — name kept as a
      // fallback while the project ID is back-filled by the admin.
      boundToProjectName: 'Qualia Solutions',
    },
  ],
};

export function getWorkPresetsForEmail(email: string | null | undefined): WorkPreset[] {
  if (!email) return [];
  const key = email.toLowerCase().trim();
  return WORK_PRESETS_BY_EMAIL[key] ?? [];
}

/**
 * Resolve a preset to a real project ID using the available active projects.
 * Returns `null` when neither the bound project ID nor the bound project
 * name matches anything the employee can clock into.
 */
export function resolveWorkPresetProjectId(
  preset: WorkPreset,
  activeProjects: Array<{ id: string; name: string }>
): string | null {
  if (preset.boundToProjectId) {
    const match = activeProjects.find((p) => p.id === preset.boundToProjectId);
    if (match) return match.id;
  }
  if (preset.boundToProjectName) {
    const target = preset.boundToProjectName.toLowerCase();
    const match = activeProjects.find((p) => p.name.trim().toLowerCase() === target);
    if (match) return match.id;
  }
  return null;
}

export function isWorkPresetId(id: string): boolean {
  return id.startsWith('preset:');
}
