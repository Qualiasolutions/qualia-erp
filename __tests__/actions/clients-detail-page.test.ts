export {};

/**
 * Source-level regression test for the client detail page (`/clients/[id]`).
 *
 * The 2026-04-28 operations diagnosis caught the page querying a non-existent
 * `project_status` column on the `projects` table; the live column is `status`.
 * This test pins the file to the live schema so the bug cannot return silently.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE_PATH = join(__dirname, '..', '..', 'app', '(portal)', 'clients', '[id]', 'page.tsx');

describe('client detail page — projects.status data contract', () => {
  const source = readFileSync(PAGE_PATH, 'utf8');

  it('does not select a `project_status` column from the projects table', () => {
    // The projects table only has `status`. `project_status` is the enum
    // type name and a column on the portal_project_mappings VIEW — not on
    // the base table. Selecting it here returns null silently.
    const lines = source.split('\n');
    const offendingLine = lines.find(
      (l) =>
        // Allow the explanatory comment (it must spell `project_status` to be
        // useful) but flag any actual code that requests/filters that column.
        !l.trim().startsWith('//') &&
        // Match `, project_status` or `'project_status'` or `.in('project_status'`
        /(['",]\s*project_status\s*[,'")\]])/.test(l)
    );
    expect(offendingLine).toBeUndefined();
  });

  it('filters active projects by the live `status` column', () => {
    // The dropdown of admin-assignable projects must use the live column.
    expect(source).toMatch(/\.in\(\s*['"]status['"]\s*,\s*\[/);
  });
});
