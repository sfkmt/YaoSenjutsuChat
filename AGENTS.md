# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router, pages, and API routes (e.g., `app/api/chat/route.ts`).
- `app/components/`: React UI in `.tsx` (PascalCase files); shared UI in `app/components/ui/`.
- `app/lib/`: Agents, formatters, and service clients (e.g., `mastra-yaosenjutsu.ts`, `chart-formatter.ts`).
- `styles/`, `templates/`, `specs/`: Global styles, writing templates, feature specs.
- `memory/`: Project rules and checklists (`memory/constitution.md`).
- Root test scripts: `test-*.js` for quick endpoint and formatter checks.

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js dev server with hot reload.
- `npm run build`: Production build.
- `npm start`: Run the production server.
- `npm run lint`: ESLint via `next lint`.
- Ad-hoc tests (Node):
  - `node test-api-status.js`, `node test-all-endpoints.js` (requires network and env vars).
  - `node test-routing-logic.js`, `node test-formatter-all.js` for local logic.

## Coding Style & Naming Conventions
- Language: TypeScript for app/lib; React 19 + Next.js 15.
- Components: PascalCase filenames in `app/components/` (e.g., `ChatGPTInterface.tsx`).
- Functions/vars: `camelCase`; constants `UPPER_SNAKE_CASE`.
- Indentation: 2 spaces; prefer explicit types in public APIs.
- Styling: Tailwind CSS 4; keep class lists concise and composable.
- Linting: Fix issues surfaced by `npm run lint` before pushing.

## Testing Guidelines
- Framework: No Jest configured; use existing `test-*.js` scripts or add similar focused checks.
- Names: `test-<area>.js` in repo root (e.g., `test-chart-output.js`).
- Execution: `node <file>`; ensure required env vars are set.
- Goal: Keep tests deterministic; target high coverage and critical-path checks (see `memory/constitution.md`).

## Commit & Pull Request Guidelines
- Commits: Prefer Conventional Commits (`feat:`, `fix:`, `chore:`). Keep messages imperative and scoped.
- Branches: Short, kebab-case feature branches (e.g., `feat/chat-streaming`) or spec IDs (e.g., `001-yaosenjutsu-ai-chat`).
- PRs: Include description, linked issues, screenshots/GIFs for UI, test steps, and notes on config changes. Passing lint required.

## Security & Configuration
- Copy `.env.example` → `.env.local`; never commit secrets.
- Key vars: `OPENAI_API_KEY`, `YAOSENJUTSU_API_KEY`, Firebase settings.
- For offline dev, prefer local endpoints and mocks under `app/api/yaosenjutsu-mock/`.
