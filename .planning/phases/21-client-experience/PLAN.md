# Phase 21: Enhanced Client Experience

**Milestone:** v1.5 Production-Ready Client Portal
**Goal:** Implement the top 3 UX features clients actually want based on industry research
**Priority:** P1 - Critical for client adoption
**Plans:** 3 plans in 1 wave

## Context

Research shows clients want to see:

1. **"What's next?"** - Current phase + next phase prominently displayed
2. **"What's waiting on me?"** - Clear action items requiring client input
3. **Progress visualization** - Visual progress bars, not just text status

Current portal has roadmap but doesn't emphasize forward momentum or client actions.

## Success Criteria

**What must be TRUE after completion:**

1. **Dashboard shows "What's Next"** - Client dashboard prominently displays current phase and next milestone
2. **Client action items are visible** - Clear section showing what client needs to do (approvals, uploads, feedback)
3. **Progress is visual** - Progress bars/percentages on dashboard and project detail
4. **30-second rule met** - Client can understand project status within 30 seconds of login

## Plans

### Plan 21-01: "What's Next" Dashboard Widget

**Goal:** Add prominent current/next phase display to client dashboard
**Tasks:**

- Create new dashboard widget showing "Currently: Phase X" and "Next: Phase Y"
- Pull phase data from project roadmap and display with progress percentage
- Add visual timeline showing completed → current → upcoming phases
- Make it the hero element on dashboard (larger, prominent placement)

### Plan 21-02: Client Action Items System

**Goal:** Show clients exactly what they need to do
**Tasks:**

- Add "Action Items" widget to dashboard showing pending client tasks
- Identify action types: file uploads, approvals, feedback requests, payments
- Create action item CRUD system linked to project phases
- Show action urgency (overdue, due soon, upcoming) with color coding

### Plan 21-03: Visual Progress Indicators

**Goal:** Replace text status with visual progress throughout portal
**Tasks:**

- Add progress bars to project cards on dashboard (% complete)
- Show milestone progress in project detail header
- Add phase completion indicators to roadmap view
- Use consistent progress visualization design system

## Dependencies

- Phase 20 (foundation fixes must work first)
- Existing roadmap/phases data structure

## Risk Assessment

**Medium risk** - Requires new UI components and data modeling for action items

## Validation

**User testing required:**

1. New client logs in → can identify project status within 30 seconds
2. Client sees clear action items and knows what to do next
3. Progress visualization accurately reflects actual project state
4. Visual hierarchy guides attention to most important information
