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

  // Extract milestone name from metadata (e.g., "**Milestone:** v5" or "**Milestone**: v5")
  let metadataMilestoneName: string | null = null;
  const metaMsMatch = content.match(/\*\*Milestone:?\*\*:?\s*(.+)/);
  if (metaMsMatch) metadataMilestoneName = metaMsMatch[1].trim();

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
    const milestoneMatch =
      line.match(
        /^## Milestone (\d+):\s*(.+?)(?:\s*[—–-]\s*(complete|in.progress|planned|pending))/i
      ) || line.match(/^## Milestone (\d+):\s*(.+?)\s*$/i);
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

    // "## Current Milestone — v1.6 Design Unification & Polish"
    const currentMsMatch = line.match(
      /^## (?:Current\s+)?Milestone\s*[—–-]\s*(.+?)(?:\s*[—–-]\s*(complete|in.progress|planned|pending))?\s*$/i
    );
    if (currentMsMatch) {
      currentMilestone = {
        number: milestones.length + 1,
        name: currentMsMatch[1].trim(),
        status: currentMsMatch[2]?.toLowerCase().replace(/\s+/g, '_') || 'in_progress',
        phases: [],
      };
      milestones.push(currentMilestone);
      currentPhase = null;
      continue;
    }

    // "## Completed Milestones" — skip this header
    if (/^## Completed Milestones/i.test(line)) continue;

    // ── Phase headers ──
    // "### Phase 0.1: Monorepo Scaffolding & Infrastructure" (dot notation)
    // "### Phase 25: Design System Enforcement" (plain number, H3)
    // "## Phase 14: Stripe Payment Safety" (plain number, H2)
    const phaseMatch = line.match(/^#{2,3} Phase (\d+(?:\.\d+)?):\s*(.+)/);
    if (phaseMatch) {
      const rawNum = phaseMatch[1];
      const phaseName = phaseMatch[2].trim();

      // Skip "## Phase Dependencies" or other non-phase headings
      if (/dependencies|summary|progress/i.test(phaseName)) continue;

      // If no milestone exists yet, create a default one
      if (!currentMilestone) {
        currentMilestone = {
          number: 1,
          name: metadataMilestoneName || 'Default',
          status: 'in_progress',
          phases: [],
        };
        milestones.push(currentMilestone);
      }

      const hasDot = rawNum.includes('.');
      const msNum = hasDot ? parseInt(rawNum.split('.')[0]) : currentMilestone.number;

      currentPhase = {
        milestoneNumber: msNum,
        phaseNumber: rawNum,
        name: phaseName,
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

    // ── Phase metadata lines (support both "- **Key**:" and "**Key:**" formats) ──
    if (currentPhase) {
      // Status: "- **Status**: complete" or "**Status:** complete"
      const statusMatch = line.match(
        /^-?\s*\*\*Status:?\*\*:?\s*(complete|completed|in.progress|planned|pending|not.started)/i
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

      // Plans: "- **Plans**: 5 plans" or "**Plans:** 2 plans"
      const plansMatch = line.match(/^-?\s*\*\*Plans:?\*\*:?\s*(\d+)/);
      if (plansMatch) {
        currentPhase.planCount = parseInt(plansMatch[1]);
        continue;
      }

      // Description: "- **Description**: ..." or "**Description:** ..."
      const descMatch = line.match(/^-?\s*\*\*Description:?\*\*:?\s*(.+)/);
      if (descMatch) {
        currentPhase.description = descMatch[1].trim();
        continue;
      }

      // Goal (description fallback): "- **Goal**: ..." or "**Goal:** ..."
      const goalMatch = line.match(/^-?\s*\*\*Goal:?\*\*:?\s*(.+)/);
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

    // ── Progress table: "| 14 | Stripe Payment Safety | ... | Complete (2026-03-25) |"
    // Extracts status for flat-numbered phases from trailing progress tables
    if (milestones.length > 0) {
      const progressRow = line.match(
        /^\|\s*(\d+)\s*\|\s*.+?\s*\|\s*.+?\s*\|\s*(Complete|In Progress|Planned|Not Started)(?:\s*\((\d{4}-\d{2}-\d{2})\))?\s*\|/i
      );
      if (progressRow) {
        const phaseNum = progressRow[1];
        const status = normalizeStatus(progressRow[2]);
        const completedAt = progressRow[3] || null;
        // Find the matching phase and update its status
        for (const ms of milestones) {
          const phase = ms.phases.find((p) => p.phaseNumber === phaseNum);
          if (phase) {
            phase.status = status;
            if (completedAt) phase.completedAt = completedAt;
            break;
          }
        }
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
