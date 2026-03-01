# Phase 3 Execution Order

## Wave Strategy

```
Wave 1 (Foundation)
└─ 03-01: Admin Client Invite UI
   │  └─ Closes Phase 2 gap
   │  └─ Duration: ~15 min
   │
   ▼
Wave 2 (Core Features - Parallel)
├─ 03-02: Shared Files
│  │  └─ Requirements: FILE-01, FILE-02, FILE-03
│  │  └─ Duration: ~25 min
│  │
│  └─ 03-03: Client Comments
│     │  └─ Requirements: CMNT-01, CMNT-02, CMNT-03
│     │  └─ Duration: ~25 min
│     │
│     ▼
Wave 3 (Integration)
└─ 03-04: Activity Feed
   └─ Depends on: 03-02, 03-03
   └─ Requirements: FEED-01, FEED-02, FEED-03
   └─ Duration: ~20 min
```

## Execution Commands

### Wave 1

```bash
/gsd execute-plan .planning/phases/03-client-portal-features/03-01-PLAN.md
```

### Wave 2 (after Wave 1 complete)

Run in parallel or sequentially:

```bash
/gsd execute-plan .planning/phases/03-client-portal-features/03-02-PLAN.md
/gsd execute-plan .planning/phases/03-client-portal-features/03-03-PLAN.md
```

### Wave 3 (after Wave 2 complete)

```bash
/gsd execute-plan .planning/phases/03-client-portal-features/03-04-PLAN.md
```

## Critical Path

The critical path (longest dependency chain) is:

```
03-01 (15 min) → 03-02 (25 min) → 03-04 (20 min) = 60 minutes
```

If running 03-02 and 03-03 in parallel:

```
03-01 (15 min) → [03-02 & 03-03 parallel (25 min)] → 03-04 (20 min) = 60 minutes
```

**Estimated total time:** 60-85 minutes depending on parallelization

## Verification Checkpoints

### After Wave 1 (03-01)

- [ ] Admin can invite client to project via UI
- [ ] Client appears in project access list
- [ ] Changes persist to client_projects table

### After Wave 2 (03-02, 03-03)

- [ ] Admin can upload files with visibility toggle
- [ ] Client sees only client-visible files
- [ ] Client can comment on phases
- [ ] Admin can reply to comments
- [ ] Internal comments hidden from clients

### After Wave 3 (03-04)

- [ ] Activity feed shows file uploads
- [ ] Activity feed shows comments
- [ ] Internal events filtered from client view
- [ ] Tab navigation works (Roadmap → Files → Updates)

## Risk Mitigation During Execution

1. **After 03-01:** Test client invite before proceeding to ensure client_projects table access works
2. **During 03-02/03-03:** Verify Supabase Storage bucket 'project-files' exists
3. **Before 03-04:** Confirm 03-02 and 03-03 completed successfully (files and comments work)
4. **After 03-04:** Run full integration test (upload file → see in timeline, comment → see in timeline)

## Rollback Strategy

If a plan fails:

1. **Revert changes:** Use git to revert commits from failed plan
2. **Fix issue:** Address the root cause
3. **Re-execute:** Run the plan again
4. **Don't proceed:** Don't start dependent plans until current plan succeeds

Wave dependencies prevent cascading failures:

- If 03-01 fails → can't test 03-02, 03-03 properly (no client assignments)
- If 03-02 or 03-03 fails → 03-04 can't integrate activity logging
- If 03-04 fails → files and comments still work, just no activity timeline
