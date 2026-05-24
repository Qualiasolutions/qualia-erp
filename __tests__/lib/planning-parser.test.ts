import { parseRoadmap, parseStateTable } from '@/lib/planning-parser';

describe('planning parser', () => {
  it('parses modern current-milestone roadmap phase tables', () => {
    const roadmap = `# Roadmap · Milestone 22 · Brand Refresh + Subscription Teardown

**Project:** USD-Academy
**Milestone:** 22
**Status:** active

## Phases

| # | Phase | Goal | Status |
|---|-------|------|--------|
| 1 | Subscription teardown | Strip tier UI and webhooks | setup |
| 2 | Brand refresh | Yellow audit across all routes | planned |
`;

    const milestones = parseRoadmap(roadmap);

    expect(milestones).toEqual([
      {
        number: 22,
        name: 'Brand Refresh + Subscription Teardown',
        status: 'in_progress',
        phases: [
          expect.objectContaining({
            milestoneNumber: 22,
            phaseNumber: '1',
            name: 'Subscription teardown',
            description: 'Strip tier UI and webhooks',
          }),
          expect.objectContaining({
            milestoneNumber: 22,
            phaseNumber: '2',
            name: 'Brand refresh',
            status: 'planned',
          }),
        ],
      },
    ]);
  });

  it('treats polished and handed_off state rows as completed', () => {
    const state = `## Roadmap
| # | Phase | Goal | Status |
|---|-------|------|--------|
| 1 | Subscription Teardown | Strip tier UI | polished |
| 2 | Handoff | Ship docs | handed_off |
`;

    const stateMap = parseStateTable(state);

    expect(stateMap.get('1')?.status).toBe('completed');
    expect(stateMap.get('2')?.status).toBe('completed');
  });
});
