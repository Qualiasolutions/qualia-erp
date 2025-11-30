# Qualia Internal Suite

## Project Overview

Qualia Internal Suite is a project planning and management application built with Next.js and Supabase. It features a modern UI using Tailwind CSS and shadcn/ui, robust authentication, and AI capabilities powered by the Vercel AI SDK.

**Key Features:**
- **Project Management:** Manage projects, issues, and teams.
- **Authentication:** Secure user authentication using Supabase Auth (Cookie-based).
- **AI Integration:** Chat interface and AI-powered features using Vercel AI SDK (Google/OpenAI).
- **Modern UI:** Responsive design with a sidebar navigation, command menu, and dark/light mode support.
- **Real-time:** Real-time updates via Supabase.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, shadcn/ui components, Lucide React icons
- **Backend & Auth:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **AI:** Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/openai`)
- **Deployment:** Vercel (recommended)

## Directory Structure

- `app/`: Next.js App Router pages and layouts.
    - `api/`: API routes (e.g., chat, auth).
    - `auth/`: Authentication pages (login, error, confirm).
    - `issues/`, `projects/`, `teams/`: Feature-specific pages.
    - `protected/`: Protected routes requiring authentication.
    - `globals.css`: Global styles and Tailwind directives.
    - `layout.tsx`: Root layout with providers (Theme, Workspace, Sidebar).
- `components/`: React components.
    - `ui/`: Reusable UI components (likely shadcn/ui).
    - `tutorial/`: Components for the onboarding tutorial.
- `lib/`: Utility functions and shared logic.
    - `supabase/`: Supabase client and server configuration.
    - `utils.ts`: Utility helpers (e.g., `cn` for class merging).
- `hooks/`: Custom React hooks (e.g., `use-realtime-chat`).
- `supabase/`: Supabase migrations and configuration.

## Setup & Development

### Prerequisites
- Node.js (Latest LTS recommended)
- A Supabase project

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Environment Variables

Rename `.env.example` to `.env.local` and populate the following:

```env
NEXT_PUBLIC_SUPABASE_URL=[YOUR_SUPABASE_URL]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[YOUR_SUPABASE_ANON_KEY]
# Add AI API keys if required
```

### Running Locally

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Building for Production

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

## Development Conventions

- **Component Library:** Use components from `components/ui` whenever possible. These follow the shadcn/ui pattern.
- **Styling:** Use Tailwind utility classes. Avoid inline styles.
- **State Management:** Use the provided contexts (`WorkspaceProvider`, `SidebarProvider`) for global state.
- **Data Fetching:**
    - Use Server Components for initial data fetching where possible.
    - Use Supabase client for client-side interactions and real-time subscriptions.
- **AI Integration:** AI logic resides in `app/api/chat/route.ts` and uses the `ai` package hooks (e.g., `useChat`) on the client.
