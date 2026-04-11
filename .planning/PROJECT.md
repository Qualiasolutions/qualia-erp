# Qualia ERP — Portal v2 (Assembly-inspired)

## Overview
Transform the existing client portal from a basic project viewer into a full-service client hub inspired by Assembly.com. The portal becomes the primary interface for client interaction — messaging, files, billing, tasks, project tracking — all in one branded experience.

## Client
Internal — Qualia Solutions

## Goals
1. **Assembly-level portal experience** — Modular app-based sidebar, modern UI, real-time messaging
2. **Client ↔ Project connection** — Clients see their projects, phases, tasks, files in an integrated view
3. **Messaging system** — Real-time chat between team and clients per project
4. **Modern admin controls** — App Library to toggle portal features, branding customization
5. **Keep existing infrastructure** — Reuse 63 tables, 49 action modules, auth system

## What Changes
- Portal UI: Complete redesign (layout, sidebar, dashboard, all views)
- Portal messaging: New feature (real-time chat)
- Portal files: Redesign with folders
- Portal tasks: Client-visible task board
- Admin: App Library + Customization panels
- Forms/Contracts: Future phases

## What Stays
- All existing DB tables and server actions (extend, don't replace)
- Auth system (Supabase JWT + middleware)
- Internal ERP (dashboard, inbox, projects, CRM, etc.)
- SWR data layer
- Design system (Qualia teal, GeistSans, shadcn/ui)

## Stack
Next.js 16+ | React 19 | TypeScript | Supabase (Realtime for chat) | Tailwind + shadcn/ui | SWR

## Key Decisions
- **No delete, only transform** — Existing portal code gets replaced file-by-file
- **Supabase Realtime for messaging** — No external chat service needed
- **App-based architecture** — Each portal section is a toggleable "app" (like Assembly)
- **Projects are central** — Portal sidebar groups everything under projects
