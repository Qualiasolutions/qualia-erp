---
phase: 2
goal: "Real-time client messaging system — per-project channels, rich text compose, internal notes, Supabase Realtime"
tasks: 4
waves: 2
---

# Phase 2: Client Messaging

Goal: Clients and team members can exchange messages in per-project channels. Messages appear in real-time. Admins/managers can write internal notes invisible to clients. The `/messages` page has a three-panel layout (channel list, thread, details). Unread counts show in the sidebar.

---

## Task 1 — Database tables + server actions + Zod schemas

**Wave:** 1
**Files:**
- `app/actions/portal-messages.ts` (new — exports `getMessageChannels`, `getChannelMessages`, `sendMessage`, `markChannelRead`, `getUnreadCounts`)
- `lib/validation.ts` (modify — add `sendMessageSchema` and `markChannelReadSchema`)

**Action:**

1. **Create two Supabase tables via MCP** (do NOT write raw SQL in code files):

   **`portal_message_channels`** — one row per project that has messaging enabled:
   | Column | Type | Notes |
   |---|---|---|
   | `id` | uuid PK default `gen_random_uuid()` | |
   | `project_id` | uuid NOT NULL references `projects(id)` ON DELETE CASCADE | UNIQUE |
   | `last_message_at` | timestamptz | updated on each new message |
   | `last_message_preview` | text | first 120 chars of last message |
   | `last_message_sender_id` | uuid references `profiles(id)` | |
   | `created_at` | timestamptz default now() | |

   **`portal_messages`** — individual messages:
   | Column | Type | Notes |
   |---|---|---|
   | `id` | uuid PK default `gen_random_uuid()` | |
   | `channel_id` | uuid NOT NULL references `portal_message_channels(id)` ON DELETE CASCADE | |
   | `project_id` | uuid NOT NULL references `projects(id)` ON DELETE CASCADE | denormalized for filtering/RLS |
   | `sender_id` | uuid NOT NULL references `profiles(id)` | |
   | `content` | text NOT NULL | plain text content |
   | `content_html` | text | optional rich HTML |
   | `is_internal` | boolean default false | true = team-only note, hidden from clients |
   | `created_at` | timestamptz default now() | |
   | `updated_at` | timestamptz | |

   **`portal_message_read_status`** — per-user read cursors:
   | Column | Type | Notes |
   |---|---|---|
   | `id` | uuid PK default `gen_random_uuid()` | |
   | `channel_id` | uuid NOT NULL references `portal_message_channels(id)` ON DELETE CASCADE | |
   | `user_id` | uuid NOT NULL references `profiles(id)` ON DELETE CASCADE | |
   | `last_read_at` | timestamptz default now() | |
   | UNIQUE(`channel_id`, `user_id`) | | |

   **Indexes:**
   - `portal_messages` — index on `(channel_id, created_at DESC)` for message loading
   - `portal_messages` — index on `(project_id)` for RLS
   - `portal_message_read_status` — index on `(user_id, channel_id)` for unread lookups

   **RLS policies (enable RLS on all three tables):**
   - `portal_message_channels`: SELECT for users who have a `client_projects` row matching the channel's `project_id`, OR users with role `admin`/`manager`/`employee`
   - `portal_messages`: SELECT where user has channel access AND (`is_internal = false` OR user role IN (`admin`, `manager`, `employee`)). INSERT where user has channel access.
   - `portal_message_read_status`: SELECT/INSERT/UPDATE where `user_id = auth.uid()`

2. **Add Zod schemas** in `lib/validation.ts`:
   ```typescript
   export const sendMessageSchema = z.object({
     projectId: z.string().uuid('Invalid project ID'),
     content: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
     contentHtml: z.string().max(50000).optional().nullable(),
     isInternal: z.boolean().default(false),
   });

   export const markChannelReadSchema = z.object({
     channelId: z.string().uuid('Invalid channel ID'),
   });
   ```

3. **Create `app/actions/portal-messages.ts`** with these server actions:

   - `getMessageChannels(userId: string)` — Query `portal_message_channels` joined with `projects(id, name, project_type)` and `portal_message_read_status` for the calling user. For clients: filter by `client_projects.client_id = userId`. For admins/managers: return all channels. Return array of `{ channel, project, unreadCount, lastMessage }`. Sort by `last_message_at DESC`.

   - `getChannelMessages(projectId: string, cursor?: string, limit?: number)` — Fetch messages from `portal_messages` where `project_id = projectId`, ordered by `created_at DESC`, with cursor pagination (messages older than cursor). Join `sender:profiles(id, full_name, email, avatar_url, role)`. For client users: filter `is_internal = false`. Default limit 50. Return `{ messages, nextCursor, hasMore }`.

   - `sendMessage(formData: z.infer<typeof sendMessageSchema>)` — Validate with Zod. Auth check: user must have access to the project (use `canAccessProject` from `lib/portal-utils.ts` for clients, `isUserManagerOrAbove` from `app/actions/shared.ts` for team). If `isInternal = true`, verify user is admin/manager/employee (not client). Upsert channel in `portal_message_channels` if it doesn't exist for this project. Insert into `portal_messages`. Update `last_message_at`, `last_message_preview`, `last_message_sender_id` on the channel. Return `ActionResult` with the new message.

   - `markChannelRead(channelId: string)` — Upsert `portal_message_read_status` setting `last_read_at = now()` for the current user + channel.

   - `getUnreadCounts(userId: string)` — For each channel the user has access to, count messages where `created_at > last_read_at` from `portal_message_read_status`. For clients, also exclude `is_internal = true`. Return `Record<string, number>` (channelId -> count) plus a `total` field.

   - `getOrCreateChannel(projectId: string)` — Internal helper. Check if `portal_message_channels` row exists for this project. If not, insert one. Return the channel row. Used by `sendMessage`.

   All actions must: authenticate via `supabase.auth.getUser()`, use `createClient` from `lib/supabase/server.ts`, return `ActionResult`, and log errors to console.

**Context:** Read `@app/actions/shared.ts` for ActionResult + auth helpers. Read `@lib/portal-utils.ts` for `canAccessProject` and `getClientProjectIds`. Read `@lib/validation.ts` for Zod pattern. Read `@app/actions/client-portal.ts` for portal action patterns. Read `@lib/hooks/use-realtime-tasks.ts` for Supabase Realtime subscription pattern (used in Task 3).

**Done when:**
- All three tables exist in Supabase with RLS enabled and policies applied
- `app/actions/portal-messages.ts` exports all 5 public functions + returns `ActionResult`
- `lib/validation.ts` contains `sendMessageSchema` and `markChannelReadSchema`
- `npx tsc --noEmit` passes with no errors related to portal-messages
- Running `grep -c "sendMessage\|getMessageChannels\|getChannelMessages\|markChannelRead\|getUnreadCounts" app/actions/portal-messages.ts` returns 5+

---

## Task 2 — SWR hooks + Realtime subscription

**Wave:** 1
**Files:**
- `lib/swr.ts` (modify — add cache keys, 3 hooks, 3 invalidation functions)
- `lib/hooks/use-realtime-messages.ts` (new — Supabase Realtime subscription for `portal_messages`)

**Action:**

1. **Add to `lib/swr.ts`** — in the `cacheKeys` object, add:
   ```typescript
   messageChannels: (userId: string) => `message-channels-${userId}`,
   channelMessages: (projectId: string) => `channel-messages-${projectId}`,
   unreadMessageCount: (userId: string) => `unread-message-count-${userId}`,
   ```

2. **Add three SWR hooks** at the end of `lib/swr.ts` (follow existing portal hook patterns like `usePortalDashboard`):

   - `useMessageChannels(userId: string | null)` — calls `getMessageChannels(userId)` from `app/actions/portal-messages.ts` via dynamic import. Config: `refreshInterval: 30000` (30s, less aggressive than tasks). Returns `{ channels, error, isLoading, isValidating, revalidate }`.

   - `useChannelMessages(projectId: string | null)` — calls `getChannelMessages(projectId)` from the same module. Config: `refreshInterval: 0` (disabled — Realtime handles live updates). Returns `{ messages, nextCursor, hasMore, error, isLoading, mutate }`. The `mutate` is exposed so the Realtime hook can optimistically insert new messages.

   - `useUnreadMessageCount(userId: string | null)` — calls `getUnreadCounts(userId)`. Config: `refreshInterval: 60000` (60s). Returns `{ counts, total, error, isLoading }`.

3. **Add three invalidation functions:**
   - `invalidateMessageChannels(userId: string, immediate = true)`
   - `invalidateChannelMessages(projectId: string, immediate = true)`
   - `invalidateUnreadMessageCount(userId: string, immediate = true)`

4. **Create `lib/hooks/use-realtime-messages.ts`** — modeled on `@lib/hooks/use-realtime-tasks.ts`:
   ```typescript
   'use client';
   import { useEffect } from 'react';
   import { createClient } from '@/lib/supabase/client';
   import { invalidateMessageChannels, invalidateChannelMessages, invalidateUnreadMessageCount } from '@/lib/swr';

   export function useRealtimeMessages(
     projectId: string | null,
     userId: string | null
   ) {
     useEffect(() => {
       if (!projectId) return;
       const supabase = createClient();
       const channel = supabase
         .channel(`portal-messages-${projectId}`)
         .on(
           'postgres_changes',
           {
             event: 'INSERT',
             schema: 'public',
             table: 'portal_messages',
             filter: `project_id=eq.${projectId}`,
           },
           () => {
             invalidateChannelMessages(projectId, true);
             if (userId) {
               invalidateMessageChannels(userId, true);
               invalidateUnreadMessageCount(userId, true);
             }
           }
         )
         .subscribe();
       return () => { supabase.removeChannel(channel); };
     }, [projectId, userId]);
   }
   ```
   Enable Supabase Realtime on the `portal_messages` table via MCP (ALTER PUBLICATION to add the table if needed).

**Context:** Read `@lib/swr.ts` (first 100 lines for cacheKeys pattern, then search for `usePortalDashboard` for hook pattern). Read `@lib/hooks/use-realtime-tasks.ts` for Realtime pattern.

**Done when:**
- `lib/swr.ts` exports `useMessageChannels`, `useChannelMessages`, `useUnreadMessageCount` and their invalidation functions
- `lib/hooks/use-realtime-messages.ts` exists and exports `useRealtimeMessages`
- `npx tsc --noEmit` passes
- `grep -c "messageChannels\|channelMessages\|unreadMessageCount" lib/swr.ts` returns 9+ (3 keys + 3 hooks + 3 invalidators)

---

## Task 3 — Messages page with three-panel layout + components

**Wave:** 2 (after Task 1, 2)
**Files:**
- `app/messages/page.tsx` (new — server component, auth + data fetch)
- `app/messages/messages-content.tsx` (new — client component, three-panel layout)
- `components/portal/messaging/channel-list.tsx` (new)
- `components/portal/messaging/message-thread.tsx` (new)
- `components/portal/messaging/message-bubble.tsx` (new)
- `components/portal/messaging/message-composer.tsx` (new)
- `components/portal/messaging/channel-details.tsx` (new)

**Action:**

1. **`app/messages/page.tsx`** — Server component:
   - Auth: get user via `supabase.auth.getUser()`, redirect if not authenticated
   - Get role via `getUserRole` from `lib/portal-utils.ts`
   - Pass `userId`, `userRole`, `isAdmin: isPortalAdminRole(role)` as props to `MessagesContent`
   - Export metadata: `{ title: 'Messages' }`

2. **`app/messages/messages-content.tsx`** — `'use client'` three-panel layout:
   - State: `selectedProjectId: string | null`, `showDetails: boolean` (right panel toggle), `mobileView: 'list' | 'thread'` (for responsive)
   - Use `useMessageChannels(userId)` for left panel
   - Use `useChannelMessages(selectedProjectId)` for center panel
   - Use `useRealtimeMessages(selectedProjectId, userId)` for live updates
   - Layout: `flex h-full` container. Three children:
     - Left: `w-72 shrink-0 border-r border-border` on `lg:`, hidden when `mobileView === 'thread'` on mobile
     - Center: `flex-1 flex flex-col` — message thread + composer
     - Right: `w-72 shrink-0 border-l border-border` on `xl:`, hidden by default, toggled by button
   - On channel select: set `selectedProjectId`, call `markChannelRead`, set `mobileView = 'thread'` on mobile
   - Mobile: show back button (ArrowLeft icon) in thread header to return to channel list
   - When no channel selected: show empty state with `MessageSquare` icon, "Select a conversation" text

3. **`components/portal/messaging/channel-list.tsx`** — Props: `channels`, `selectedProjectId`, `onSelectChannel`, `userId`:
   - Search input at top: `<Input placeholder="Search conversations..." />` filtering channels by project name
   - Scrollable list via `<ScrollArea>`: each channel row is a button with:
     - Project name (text-sm font-medium)
     - Last message preview (text-xs text-muted-foreground, line-clamp-1)
     - Time since last message (text-xs text-muted-foreground, use `formatDistanceToNow` from date-fns)
     - Unread badge: `<Badge>` with count if > 0, using `bg-primary text-primary-foreground text-[10px] h-5 min-w-5 rounded-full`
   - Selected channel: `bg-primary/[0.06] border-l-2 border-primary` (matches sidebar active pattern from DESIGN.md)
   - Hover: `hover:bg-muted/50 transition-colors duration-150`

4. **`components/portal/messaging/message-thread.tsx`** — Props: `projectId`, `messages`, `isLoading`, `hasMore`, `onLoadMore`, `userId`, `isAdmin`:
   - Header bar: project name + info button (toggles right panel) + back button on mobile
   - Scrollable message area: `<ScrollArea>` with messages rendered via `<MessageBubble>`
   - Messages sorted chronologically (oldest at top, newest at bottom)
   - Auto-scroll to bottom on new messages (use `useRef` on scroll container + `useEffect` watching messages length)
   - "Load earlier messages" button at top if `hasMore` is true
   - Internal messages section: if `isAdmin`, show internal messages with a distinct visual indicator (amber left border + "Internal" label)
   - For clients: internal messages are already filtered out server-side

5. **`components/portal/messaging/message-bubble.tsx`** — Props: `message`, `isOwn: boolean`, `showSender: boolean`:
   - Layout: sender avatar (left), content area (right)
   - Avatar: 32x32 circle with initials, `bg-primary/10 text-primary` for team, `bg-muted text-muted-foreground` for client
   - Sender name + role badge: `text-xs font-medium` + `text-[10px] text-muted-foreground`
   - Content: if `content_html`, render via `dangerouslySetInnerHTML` inside a `prose prose-sm` container. If plain text, use the existing `<RichText>` component from `@components/ui/rich-text.tsx`
   - Timestamp: `text-[11px] text-muted-foreground/60` aligned right, use `format(date, 'h:mm a')` from date-fns
   - Internal messages: `border-l-2 border-amber-400 bg-amber-50/50 dark:bg-amber-500/5` with "Internal" chip
   - Group consecutive messages from same sender: hide avatar + name for subsequent messages within 2-minute window
   - Entrance animation: `animate-fade-in` on new messages

6. **`components/portal/messaging/message-composer.tsx`** — Props: `projectId`, `onSend`, `isAdmin`, `disabled`:
   - Simple `<textarea>` with auto-resize (not a full rich text editor — keep it lean for Phase 2). Use `rows={1}` with CSS `resize: none; max-height: 120px; overflow-y: auto` and adjust height via `onInput` reading `scrollHeight`.
   - Formatting toolbar below textarea (visible on focus or when text is entered):
     - Bold (Ctrl+B wraps selection in `**`), Italic (Ctrl+I wraps in `*`), Link (Ctrl+K prompts for URL)
     - Use `<Button variant="ghost" size="sm">` with Lucide icons: `Bold`, `Italic`, `Link2`
   - Send button: `<Button size="sm">` with `Send` icon, aligned right. Enabled when content is non-empty.
   - If `isAdmin`: toggle for "Internal note" — a small switch or button that when active shows amber border and "Only visible to team" label
   - Submit: on Enter (without Shift), call `sendMessage` action, clear textarea, optimistically add message to thread via SWR mutate
   - Shift+Enter: newline

7. **`components/portal/messaging/channel-details.tsx`** — Props: `projectId`, `isAdmin`:
   - Fetch project details from existing `usePortalProjectWithPhases(projectId)` hook
   - Display: project name, type badge, status, creation date
   - Phase progress: current phase name + progress bar (reuse portal patterns)
   - If `isAdmin`: "Internal Notes" section with a filtered view of `is_internal = true` messages from the channel

**Context:** Read `@.planning/DESIGN.md` for all styling decisions. Read `@components/portal/portal-sidebar-v2.tsx` for active/hover state patterns. Read `@components/ui/rich-text.tsx` for the existing RichText renderer. Read `@app/portal/layout.tsx` for auth pattern in portal pages. Read `@lib/swr.ts` for `usePortalProjectWithPhases` pattern. Use shadcn components: `Input`, `Button`, `Badge`, `ScrollArea`, `Avatar`, `Tabs` from `@components/ui/`.

**Done when:**
- `/messages` renders the three-panel layout without errors
- Channel list shows projects the user has access to, with last message preview and time
- Clicking a channel loads its messages in the center panel
- User can type and send a message; it appears in the thread
- Internal note toggle works for admin/manager users and shows amber styling
- Messages auto-scroll to bottom on new messages
- Mobile responsive: channel list on small screens, tap to open thread, back button returns to list
- Dark mode renders correctly (check card backgrounds, text colors, borders)
- `npx tsc --noEmit` passes

---

## Task 4 — Sidebar integration + unread badge + polish

**Wave:** 2 (after Task 1, 2)
**Files:**
- `components/portal/portal-sidebar-v2.tsx` (modify — enable Messages link, add unread badge)
- `app/portal/layout.tsx` (modify — pass userId to sidebar for unread hook)

**Action:**

1. **Update `components/portal/portal-sidebar-v2.tsx`**:
   - Change the Messages nav item from `{ name: 'Messages', href: null, icon: MessageSquare, comingSoon: true }` to `{ name: 'Messages', href: '/messages', icon: MessageSquare }`
   - Add `userId` prop to `PortalSidebarV2Props` and `SidebarContent`
   - Inside `SidebarContent`, call `useUnreadMessageCount(userId)` from `lib/swr.ts`
   - In the `NavLink` component, accept an optional `badge?: number` prop. When present and > 0, render: `<span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{badge}</span>` — replacing the "Soon" badge for that item
   - Pass `badge={unreadTotal}` to the Messages NavLink only (using the `total` from unread counts)
   - Add a `NavItemDef` field: `badgeKey?: string` so only the Messages item gets the dynamic badge

2. **Update `app/portal/layout.tsx`**:
   - Pass `userId={user.id}` to `<PortalSidebarV2>` (the `user` object is already available from the auth check)

3. **Polish passes:**
   - Verify the Messages nav item is no longer grayed out / disabled
   - Verify clicking it navigates to `/messages`
   - Verify the unread badge appears when there are unread messages and disappears when count is 0
   - Verify the badge uses `bg-primary text-primary-foreground` (teal, not red — matches brand)

**Context:** Read `@components/portal/portal-sidebar-v2.tsx` for current nav structure. Read `@app/portal/layout.tsx` for how props are passed. Read `@.planning/DESIGN.md` for badge styling.

**Done when:**
- Messages link in sidebar navigates to `/messages` (not disabled)
- Unread count badge shows next to Messages when count > 0
- Badge disappears when all messages are read
- No "Soon" label on Messages anymore
- `npx tsc --noEmit` passes
- `grep "comingSoon" components/portal/portal-sidebar-v2.tsx` shows Messages is no longer in the "coming soon" list (only Files should remain)

---

## Success Criteria

- [ ] `/messages` loads with three-panel layout (channel list, thread, details)
- [ ] Channel list shows projects the client has access to with last message preview and timestamp
- [ ] Clicking a channel loads its message history in the center panel
- [ ] User can compose and send messages; message appears in thread immediately
- [ ] Rich text shortcuts work (Ctrl+B for bold, Ctrl+I for italic, Ctrl+K for link)
- [ ] Messages appear in real-time without page refresh (Supabase Realtime)
- [ ] Unread count badge shows in sidebar Messages nav item
- [ ] Internal notes tab visible only to admin/manager users (amber left border indicator)
- [ ] Clients cannot see internal messages (server-side filtered)
- [ ] Mobile responsive: channel list view, tap to thread, back button navigation
- [ ] Dark mode works across all messaging components
- [ ] `npx tsc --noEmit` passes with zero errors
