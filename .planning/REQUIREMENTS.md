# Requirements — Portal v2

## Functional Requirements

### FR-1: Portal Shell
- Sidebar navigation with: Home, Projects (expandable), Messages, Files, Billing, Tasks, Settings
- Sidebar shows company branding (logo + name)
- Sidebar collapses on mobile to hamburger menu
- Active route highlighting
- User avatar + dropdown at bottom (profile, theme toggle, logout)

### FR-2: Portal Dashboard (Home)
- Greeting with date and client name
- Stats cards: Active projects, Pending tasks, Unread messages, Outstanding invoices
- Action items list (pending approvals, uploads, feedback needed)
- Projects overview with progress indicators
- Recent activity feed
- Quick action buttons

### FR-3: Projects
- Projects list with status badges, progress bars, type icons
- Project detail with tabbed interface: Overview, Roadmap, Files, Messages, Tasks
- Phase timeline with expandable deliverables
- Phase comments/discussion threads

### FR-4: Messaging (Phase 2)
- Per-project message channels
- Rich text editor
- File attachments
- Internal notes sidebar (team-only)
- Unread message counts in sidebar
- Real-time updates via Supabase Realtime

### FR-5: Files (Phase 3)
- Folder structure per project
- Upload with drag-and-drop
- File preview (images, PDFs)
- Download links
- Client upload capability

### FR-6: Billing
- Invoice list with status (paid, pending, overdue)
- Payment summary stats
- Invoice detail view

### FR-7: Tasks (Phase 3)
- Client-visible tasks per project
- Status tracking (todo, in progress, done)
- Due dates and priorities

### FR-8: Admin Controls (Phase 4)
- App Library: Toggle apps per client
- Customization: Logo, brand name, colors
- Portal preview

## Non-Functional Requirements

### NFR-1: Performance
- First contentful paint < 1.5s
- SWR auto-refresh every 45s
- Lazy load below-fold content

### NFR-2: Accessibility
- WCAG AA compliance
- Keyboard navigation
- Screen reader support
- Focus management

### NFR-3: Responsive Design
- Mobile-first (320px minimum)
- Breakpoints: sm(640), md(768), lg(1024), xl(1280)
- Touch targets 44x44px minimum

### NFR-4: Security
- RLS on all portal tables
- Server-side auth checks on every action
- Client can only see own data
- No service_role key client-side
