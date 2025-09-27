# Repository Guidelines

## Project Structure & Module Organization
Source lives under `src/` with `main/` for the Electron process, `preload/` for the isolated bridge, and `renderer/` for the Vite-powered UI. Build output lands in `out/` (dev) and `dist/` (packaged installers). Shared assets, including the U²Net model, belong in `assets/`; keep large binaries in `assets/models/`. Automation scripts for multi-platform builds sit in `scripts/`. Logs from local runs gather in `logs/`; clear them before committing unless they illustrate an issue.

## Build, Test, and Development Commands
Install deps with `npm install`. Use `npm run dev` for a hot-reload Electron session, and `npm run build` to emit production bundles in `out/`. Package installers with `npm run dist`, or target platforms via `npm run build:win`, `npm run build:mac`, or `npm run build:linux`. Run `npm run preview` to inspect the renderer bundle alone. Keep native dependencies aligned with `npm run rebuild` after Node/Electron upgrades.

## Coding Style & Naming Conventions
TypeScript is the default; keep files as `.ts`/`.tsx`. Prettier enforces 2-space indentation, 100-character lines, single quotes, and semicolons—run `npx prettier --write .` before large submissions. ESLint (see `.eslintrc.js`) forbids unused variables and encourages `const`; prefix intentionally unused params with `_`. Use `PascalCase` for classes, `camelCase` for functions and variables, and `SCREAMING_SNAKE_CASE` only for constants.

## Testing Guidelines
There is no dedicated unit-test harness yet; rely on the sample pipeline via `npm run sample` to sanity-check ONNX integration. Always run `npm run typecheck` and `npm run lint` before pushing. When adding automated tests, follow the existing `src` structure and co-locate specs near the modules they cover; name files `*.spec.ts`. Document any manual QA steps in your PR.

## Commit & Pull Request Guidelines
History favors short, imperative commit subjects (e.g., `Add GPU mode toggle`). Group unrelated work into separate commits and add focused body paragraphs when context matters. For pull requests, include a summary, highlight user-facing changes with screenshots or GIFs, and reference issues with `Fixes #123` when applicable. Call out platform-specific impacts and model or asset updates so reviewers can re-validate packaging.

## Model & Configuration Notes
Never commit proprietary models; add download instructions or scripts instead. Validate that paths in `electron-builder.json` still match any new assets. Use environment variables (e.g., `LOG_LEVEL`) via `.env` files ignored by Git, and document new keys in the README.
