# Summary: 23 — Pipeline Flow View

## What was done

### 1. Created `components/ui/pipeline-flow.tsx`

- Repurposed n8n workflow block design into a **pipeline flow visualizer** for project phases
- Draggable nodes with framer-motion, bezier curve connections via SVG
- Status-aware styling using existing `PHASE_STATUS_CONFIG` and `UNIVERSAL_PIPELINE` constants
- Progress bars on each node showing task completion
- Connection lines change style based on phase status (solid for completed, dashed for pending, highlighted for active transition)
- Footer stats showing completed phases and total task progress
- Click-to-select phases (integrates with existing `activePhaseId` state)

### 2. Integrated into `components/project-pipeline/index.tsx`

- Added grid/flow view toggle (LayoutGrid + Workflow icons)
- Flow view maps `PhaseWithDetails` to `PipelineFlowProps` interface
- Grid view remains default, flow view is opt-in
- Both views share the same `activePhaseId` state

## Dependencies

- `framer-motion` — already installed
- `lucide-react` — already installed
- No new dependencies required

## Files changed

- `components/ui/pipeline-flow.tsx` (new)
- `components/project-pipeline/index.tsx` (modified)

## Verification

- `npx tsc --noEmit` passes clean
