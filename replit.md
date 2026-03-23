# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Python**: 3.11 (FastAPI CSP solver service)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (proxy to Python CSP service)
│   ├── csp-scheduler/      # React + Vite frontend (main web app at /)
│   └── csp-solver/         # Python FastAPI CSP solver service (port 8001)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace config
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Applications

### CSP Scheduler (`artifacts/csp-scheduler`)

React + Vite frontend at `/`. Provides:
- Form-based input for subjects, teachers, rooms, time slots
- "Generate Schedule" button triggers the CSP solver
- Timetable grid display (Days × Time slots)
- Multiple solutions browser
- Step-by-step solving trace log
- PDF export via html2canvas + jspdf
- State managed with Zustand

### CSP Solver Python Service (`artifacts/csp-solver`)

FastAPI Python service running at port 8001. Implements:
- **Backtracking Search**
- **Forward Checking** 
- **Constraint Propagation (AC-3)**
- **MRV (Minimum Remaining Values) heuristic**
- **Degree Heuristic**

Endpoints:
- `GET /csp/health` — health check
- `POST /csp/solve` — solve CSP scheduling problem

### API Server (`artifacts/api-server`)

Express 5 API server at `/api`. Proxies CSP requests to Python service:
- `GET /api/csp/health`
- `POST /api/csp/solve`

## Workflows

- `CSP Solver (Python)`: `CSP_PORT=8001 python3 artifacts/csp-solver/main.py`
- `artifacts/api-server: API Server`: `pnpm --filter @workspace/api-server run dev`
- `artifacts/csp-scheduler: web`: `pnpm --filter @workspace/csp-scheduler run dev`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## API Contract

OpenAPI spec at `lib/api-spec/openapi.yaml`. Run codegen with:
```
pnpm --filter @workspace/api-spec run codegen
```

Key endpoints:
- `POST /api/csp/solve` — main solver endpoint
  - Input: subjects, teachers, rooms, timeSlots, maxSolutions, includeSteps
  - Output: solutions array (timetable entries), stats, optional step-by-step trace

## Environment Variables

- `CSP_SERVICE_URL` — URL of the Python CSP service (default: `http://localhost:8001`)
- `CSP_PORT` — Port for the Python CSP service (default: 8001)
