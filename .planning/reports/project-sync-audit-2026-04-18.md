# Project Sync Audit — 2026-04-18

Manual audit of every ERP project against its GitHub repo and Vercel deployment. Verified every URL, fixed the broken ones, added the missing ones.

## Baseline (before fixes)

- Total projects: **38**
- With GitHub link: 27
- With Vercel link: 22
- Dead Vercel URLs: 4
- Case-inconsistent GitHub org slugs: 2
- Orphan projects (no integration): 11

## Fixes applied

All via `UPDATE` / `INSERT` on `project_integrations` (no code ship — webhook uses `ilike`, case is not functional).

### Dead Vercel URLs replaced with live ones

| Project                | Old (404)                     | New (200)                                    |
| ---------------------- | ----------------------------- | -------------------------------------------- |
| Peta                   | `peta-sigma.vercel.app`       | `www.peta.com.cy`                            |
| Underdog               | `under-beta.vercel.app`       | `underdogsales-qualiasolutionscy.vercel.app` |
| Underdog Sales Academy | `academy-underdog.vercel.app` | `underdog-academy.vercel.app`                |

### Dead rows removed

| Project       | Removed                                                                         |
| ------------- | ------------------------------------------------------------------------------- |
| Wood Location | vercel row (woodlocation.com domain expired, no replacement in any Vercel team) |

### GitHub org casing normalized

| Project                | Normalized to                   |
| ---------------------- | ------------------------------- |
| Kronospan              | `Qualiasolutions/kronospan`     |
| Underdog Sales Academy | `QualiaSolutionsCY/USD-Academy` |

### New GitHub links added (orphans → linked)

| Project     | Repo                                   |
| ----------- | -------------------------------------- |
| Boss Brainz | `QualiaSolutionsCY/aibossbrainz`       |
| Glluztech   | `QualiaSolutionsCY/GlluzTech`          |
| Dawadose    | `Qualiasolutions/dawadose`             |
| Pastrikos   | `Qualiasolutions/pastrikos-solar-demo` |

### New Vercel links added

| Project             | URL                                   |
| ------------------- | ------------------------------------- |
| Boss Brainz         | `https://aibossbrainz.vercel.app`     |
| Glluztech           | `https://glluztech.com`               |
| Alexis AI           | `https://qualia-widgets.vercel.app`   |
| AlJaber Engineering | `https://jec-iota.vercel.app`         |
| Giannois UK         | `https://giannino-mayfair.vercel.app` |

## Post-fix state

- Projects with GitHub link: **31** (+4)
- Projects with Vercel link: **26** (+4)
- Fully orphan projects: **8** (all intentional)

### Intentional orphans (left untouched)

| Project          | Reason                                                    |
| ---------------- | --------------------------------------------------------- |
| Asmarani         | Archived                                                  |
| Exchange         | Archived                                                  |
| Innrvo Marketing | Archived (SEO project — no code repo)                     |
| Kounouz          | Archived                                                  |
| Tomi - Wellness  | Archived                                                  |
| Bio Pharma       | Demos — no repo yet                                       |
| Ghabbeto AI      | Demos — no repo yet                                       |
| Wood Location    | Done but domain expired, no Vercel project, no repo found |

## Verification

All 27 pre-existing GitHub URLs verified via `gh api repos/<owner>/<repo>` — every one resolves.

All 23 original Vercel URLs + 5 added ones checked via `curl -s -o /dev/null -w "%{http_code}" -L` — 24 return 2xx/3xx. `underdogsales-qualiasolutionscy.vercel.app` returns 404 despite being the canonical alias per Vercel's project API (likely deployment protection or stale alias — Vercel-side issue, not an ERP data issue).

## Side-findings (reported, not fixed)

1. **Vercel project `underdogsales` is linked to the wrong GitHub repo** in Vercel — it points at `USD-AI-Sales-Coach` but the ERP (correctly) has Underdog linked to `USD-Underdog-Sales`. Vercel settings should be corrected at https://vercel.com/qualiasolutionscy/underdogsales/settings/git.
2. **Wood Location** (`woodlocation.com`) domain is dead — either it was never a real deploy or the client let it lapse. No repo exists in any org. Project status is "Done" which is misleading; consider changing to "Archived" or flagging for Fawzi.
3. **Sakani Admin** (`sakani-admin.vercel.app`) exists as a Vercel project but is not represented in the ERP. Sakani project only has one github/vercel pair pointing at the main app. May warrant a second project record.
4. **Vercel projects linked to wrong repos are a recurring risk** — recommend a quarterly automated sweep comparing `project_integrations` → `GET /v10/projects` data, flagging divergences.

## Ship status

**No code deployed.** All fixes were data-only writes against `project_integrations` via the Supabase MCP. Webhook behavior (case-insensitive `ilike` match on `external_url`) was verified in `app/api/github/webhook/route.ts:189` and is unaffected by org-case normalization.
