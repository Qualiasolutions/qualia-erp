/**
 * Parsers for .planning/ROADMAP.md and STATE.md files.
 * Used by both the GitHub webhook (automatic) and the manual sync action.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedPhase {
  milestoneNumber: number;
  phaseNumber: string; // "0.1", "3.10" etc.
  name: string;
  description: string | null;
  status: string; // "completed", "in_progress", "planned", "not_started"
  planCount: number;
  plansCompleted: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ParsedMilestone {
  number: number;
  name: string;
  status: string;
  phases: ParsedPhase[];
}

// ─── ROADMAP.md parser ──────────────────────────────────────────────────────

export function parseRoadmap(content: string): ParsedMilestone[] {
  const milestones: ParsedMilestone[] = [];
  const lines = content.split('\n');

  let currentMilestone: ParsedMilestone | null = null;
  let currentPhase: ParsedPhase | null = null;

  for (const line of lines) {
    // ── Milestone headers ──
    // "## Phase 0: Central Bank Demo (Weeks 1-3)"
    const milestonePhase0 = line.match(/^## Phase 0:\s*(.+?)(?:\s*\(.*\))?\s*$/);
    if (milestonePhase0) {
      currentMilestone = {
        number: 0,
        name: milestonePhase0[1].trim(),
        status: 'complete',
        phases: [],
      };
      milestones.push(currentMilestone);
      currentPhase = null;
      continue;
    }

    // "## Milestone 1: Core Identity & Auth — complete (2026-03-19 to 2026-03-23)"
    const milestoneMatch = line.match(
      /^## Milestone (\d+):\s*(.+?)(?:\s*—\s*(complete|in.progress|planned|pending))?/i
    );
    if (milestoneMatch) {
      currentMilestone = {
        number: parseInt(milestoneMatch[1]),
        name: milestoneMatch[2].trim().replace(/\s*\|.*$/, ''),
        status: milestoneMatch[3]?.toLowerCase().replace(/\s+/g, '_') || 'pending',
        phases: [],
      };
      milestones.push(currentMilestone);
      currentPhase = null;
      continue;
    }

    // ── Phase headers ──
    // "### Phase 0.1: Monorepo Scaffolding & Infrastructure"
    const phaseMatch = line.match(/^### Phase (\d+\.\d+):\s*(.+)/);
    if (phaseMatch && currentMilestone) {
      const phaseNum = phaseMatch[1];
      const msNum = parseInt(phaseNum.split('.')[0]);

      currentPhase = {
        milestoneNumber: msNum,
        phaseNumber: phaseNum,
        name: phaseMatch[2].trim(),
        description: null,
        status: 'not_started',
        planCount: 0,
        plansCompleted: 0,
        startedAt: null,
        completedAt: null,
      };
      currentMilestone.phases.push(currentPhase);
      continue;
    }

    // ── Phase metadata lines ──
    if (currentPhase) {
      // Status: "- **Status**: complete (2026-03-19)"
      const statusMatch = line.match(
        /^- \*\*Status\*\*:\s*(complete|completed|in.progress|planned|pending|not.started)/i
      );
      if (statusMatch) {
        const rawStatus = statusMatch[1].toLowerCase().replace(/\s+/g, '_');
        if (rawStatus === 'complete' || rawStatus === 'completed') {
          currentPhase.status = 'completed';
          const dateMatch = line.match(/\((\d{4}-\d{2}-\d{2})/);
          if (dateMatch) currentPhase.completedAt = dateMatch[1];
        } else if (rawStatus.includes('progress')) {
          currentPhase.status = 'in_progress';
        } else if (rawStatus === 'planned') {
          currentPhase.status = 'planned';
        } else {
          currentPhase.status = 'not_started';
        }
        continue;
      }

      // Plans: "- **Plans**: 5 plans"
      const plansMatch = line.match(/^- \*\*Plans\*\*:\s*(\d+)/);
      if (plansMatch) {
        currentPhase.planCount = parseInt(plansMatch[1]);
        continue;
      }

      // Description: "- **Description**: ..."
      const descMatch = line.match(/^- \*\*Description\*\*:\s*(.+)/);
      if (descMatch) {
        currentPhase.description = descMatch[1].trim();
        continue;
      }

      // Goal (description fallback)
      const goalMatch = line.match(/^- \*\*Goal\*\*:\s*(.+)/);
      if (goalMatch) {
        if (!currentPhase.description) {
          currentPhase.description = goalMatch[1].trim();
        }
        continue;
      }

      // Plan checklist items: "- [x] 03.0-02-PLAN.md — ..."
      const planCheckMatch = line.match(/^- \[(x| )\]/i);
      if (planCheckMatch) {
        if (planCheckMatch[1].toLowerCase() === 'x') {
          currentPhase.plansCompleted++;
        }
        continue;
      }
    }
  }

  return milestones;
}

// ─── STATE.md parser ────────────────────────────────────────────────────────

export function parseStateTable(
  content: string
): Map<string, { status: string; started: string | null; completed: string | null }> {
  const map = new Map<
    string,
    { status: string; started: string | null; completed: string | null }
  >();
  const lines = content.split('\n');

  for (const line of lines) {
    // Match table rows like: | 3.1 | Guard Module | in progress | 2026-03-27 | — |
    const rowMatch = line.match(
      /^\|\s*(\d+\.\d+(?:–\d+\.\d+)?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/
    );
    if (rowMatch) {
      const phaseRange = rowMatch[1];
      const status = rowMatch[3].trim().toLowerCase();
      const started = rowMatch[4].trim();
      const completed = rowMatch[5].trim();

      // Handle ranges like "0.1–0.9"
      const rangeMatch = phaseRange.match(/^(\d+)\.(\d+)–\d+\.(\d+)$/);
      if (rangeMatch) {
        const ms = parseInt(rangeMatch[1]);
        const startSub = parseInt(rangeMatch[2]);
        const endSub = parseInt(rangeMatch[3]);
        for (let sub = startSub; sub <= endSub; sub++) {
          map.set(`${ms}.${sub}`, {
            status: normalizeStatus(status),
            started: started === '—' ? null : started,
            completed: completed === '—' ? null : completed,
          });
        }
      } else {
        map.set(phaseRange, {
          status: normalizeStatus(status),
          started: started === '—' ? null : started,
          completed: completed === '—' ? null : completed,
        });
      }
    }
  }
  return map;
}

export function normalizeStatus(raw: string): string {
  const s = raw.toLowerCase().replace(/\s+/g, '_');
  if (s.includes('complete') || s.includes('done')) return 'completed';
  if (s.includes('progress')) return 'in_progress';
  if (s.includes('planned')) return 'planned';
  if (s.includes('pending')) return 'not_started';
  return 'not_started';
}
