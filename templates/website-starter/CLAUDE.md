# [Project Name] - Website

## Overview

Marketing website built for [Client Name].

## Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **Styling**: Tailwind CSS
- **Animations**: Motion (motion/react)
- **Deployment**: Vercel

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Commands

| Command            | Description           |
| ------------------ | --------------------- |
| `npm run dev`      | Start Vite dev server |
| `npm run build`    | Production build      |
| `npm run preview`  | Preview production    |
| `npm run lint`     | Run ESLint            |
| `npm test`         | Run Vitest            |
| `npm run test:e2e` | Playwright E2E tests  |

## Project Structure

```
├── App.tsx                # Main routing config
├── main.tsx              # Entry point
├── index.css             # Global styles
├── pages/                # Page components
│   ├── Home.tsx
│   ├── About.tsx
│   ├── Services.tsx
│   └── Contact.tsx
├── components/
│   ├── ui/               # Reusable UI components
│   ├── Hero/             # Hero section
│   ├── Navigation/       # Nav components
│   └── Footer/           # Footer
├── lib/                  # Utilities
├── public/               # Static assets
├── vite.config.ts        # Vite config
└── tailwind.config.ts    # Tailwind config
```

## Routing Patterns

Using React Router v7 with lazy loading:

```tsx
// Always use navigate() from React Router
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/about');

// NEVER use setView() or similar patterns
```

## Adding New Routes

1. Create page component in `pages/`
2. Add lazy import in `App.tsx`
3. Add route in the Routes section

## Environment Variables

```bash
# App
VITE_APP_URL=http://localhost:5173

# Optional: API integrations
# VITE_API_KEY=
```

## Deployment

1. Connect repo to Vercel
2. Set environment variables
3. Auto-deploys from main branch

## Client

- **Name**: [Client Name]
- **Brand Color**: [Color]
- **Domain**: [Domain if applicable]
