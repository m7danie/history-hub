# AI agent guide for History Hub

For repository-specific rules, follow `.github/copilot-instructions.md`.

Most work should stay inside `src/`, `server/`, `tests/`, `scripts/`, and the small root configuration files. Avoid dependency/runtime/generated folders such as `node_modules/`, `.venv/`, `.runtime/`, `dist/`, and Python caches.

Favor small, reversible changes over broad rewrites. Keep the app local-first and preserve the existing Ollama-based AI path unless the user explicitly asks to change providers.
