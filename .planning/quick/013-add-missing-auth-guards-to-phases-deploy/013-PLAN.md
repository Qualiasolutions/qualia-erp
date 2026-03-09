# Plan: 013 — Add Missing Auth Guards

**Mode:** quick (inline)
**Created:** 2026-03-10

## Task 1: Add auth guards to phases.ts mutations

**Files:** `app/actions/phases.ts`
**What:** Add `getUser()` check to createProjectPhase, deleteProjectPhase, updateProjectPhase, unlockPhase
**Done when:** All mutation functions reject unauthenticated callers

## Task 2: Add auth guards to deployments.ts

**Files:** `app/actions/deployments.ts`
**What:** Add `getUser()` check to all 5 functions (read + write)
**Done when:** All functions reject unauthenticated callers

## Task 3: Add auth guards to pipeline.ts mutations

**Files:** `app/actions/pipeline.ts`
**What:** Add `getUser()` + admin check to bulk ops (resetAllPhaseTasks, linkTasksToPhases, initializePipelinesForAllProjects, populateDefaultTasksForAllProjects, updateAllProjectPhaseTasks, migrateAllProjectsToGSD). Add basic `getUser()` to per-record mutations (deletePhaseResource, updatePhaseName, deletePhase, updatePhaseStatus)
**Done when:** Bulk ops require admin, per-record mutations require auth

## Task 4: Fix logo upload IDOR

**Files:** `app/actions/logos.ts`
**What:** Add workspace membership check so only users in the same workspace can upload logos
**Done when:** uploadProjectLogo and uploadClientLogo verify user has workspace access to the entity
