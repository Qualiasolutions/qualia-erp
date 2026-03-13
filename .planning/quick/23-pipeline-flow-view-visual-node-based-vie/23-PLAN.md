# Plan: 23 — Pipeline flow view for project phases

**Mode:** quick (no-plan)
**Created:** 2026-03-13

## Task 1: Create PipelineFlow component

**What:** Repurpose n8n workflow block design into a pipeline flow visualizer for GSD phases (SETUP → DISCUSS → PLAN → EXECUTE → VERIFY → SHIP). Draggable nodes with bezier connections, status-aware colors, and progress bars.
**Files:** `components/ui/pipeline-flow.tsx`
**Done when:** Component renders phase nodes with connections and status colors

## Task 2: Integrate flow view toggle into ProjectPipeline

**What:** Add grid/flow view toggle to the project pipeline component. Grid view remains default, flow view shows the visual pipeline.
**Files:** `components/project-pipeline/index.tsx`
**Done when:** Users can toggle between grid and flow views
