# Start Here — Updating History Hub with AI

This guide is for making small, safe changes to History Hub with GitHub Copilot in VS Code without wasting AI usage.

## 1. Open the right folder

Open the **`history-hub`** folder in VS Code — not a parent folder that contains other projects.

That keeps the AI focused on this app.

## 2. Let Copilot use the project instructions

The repository includes:

- `.github/copilot-instructions.md` — detailed instructions for GitHub Copilot
- `AGENTS.md` — a short guide for other coding agents

You should not need to explain the whole project every time.

## 3. Ask for one change at a time

Good request:

> On the practice test, add a button that lets me retry only the questions I missed. Reuse the existing styling. Do not change anything else. Run the tests and build when finished.

Less useful request:

> Make my app better.

Small requests are cheaper, easier for AI to understand, and much easier to undo if something goes wrong.

## 4. Tell the AI what NOT to change

When a request is narrow, add a sentence such as:

> Do not redesign the page or change unrelated files.

The permanent project instructions already say this, but repeating it for an important change is useful.

## 5. Save a working version before a larger change

If this project is in GitHub, commit the working version before asking AI for a large feature.

In VS Code:

1. Open **Source Control**.
2. Review the changed files.
3. Commit the working version with a short message such as `working before quiz changes`.
4. Then ask Copilot to make the new feature.

If the change goes badly, Git makes it much easier to return to the working version.

## 6. Run History Hub locally

History Hub has two pieces:

- the React/Vite website
- a local Python server that stores study sets and talks to Ollama

### Terminal 1 — local backend

Make sure the Ollama app is running first, then from the `history-hub` folder run:

```sh
sh scripts/ai.sh
```

The backend should start on `http://127.0.0.1:8766`.

### Terminal 2 — website

From the same project folder run:

```sh
npm run dev
```

If `npm` is not available but the bundled runtime is present, use:

```sh
sh scripts/npm.sh run dev
```

Open the local address Vite prints, normally `http://127.0.0.1:5173`.

## 7. Test an AI-made change

For normal frontend changes, ask Copilot to run:

```sh
npm test
npm run build
```

Then open the app and try the changed feature yourself.

## 8. Keep AI costs low

Use these habits:

- Ask for one feature or bug fix at a time.
- Point to the page or component when you know it.
- Do not ask the AI to "review the whole project" unless necessary.
- Do not ask it to repeatedly explain the entire codebase.
- Use the existing Ollama integration for study-content generation instead of adding a paid API.
- Use a stronger paid coding model only when a smaller/cheaper model cannot solve the problem.

The agent instructions tell AI tools not to read `node_modules`, `.venv`, `.runtime`, `dist`, and cache folders.

## 9. Useful request templates

### Add a feature

> Add [feature] to [page/component]. Reuse the existing design and components. Make the smallest change necessary. Do not change unrelated behavior. Run tests and the production build when finished.

### Fix a bug

> Fix this bug: [describe what happens]. First identify the cause, then make the smallest fix. Do not refactor unrelated code. Test the fix when finished.

### Change text or content

> Change [specific text/content] in [page]. Do not alter the layout, styling, or other pages.

### Ask AI to inspect before editing

> Find where [feature] is implemented. Tell me which source files are involved, then make the smallest change needed for [request]. Ignore dependency and generated folders.

## 10. Important project facts

- Frontend: React + TypeScript + Vite
- Backend: local Python HTTP server
- Data: local SQLite database in `~/.history-hub/`
- Study AI: local Ollama, so study generation does not require paid per-token API usage
- Default Ollama model: `gemma3:12b` unless `OLLAMA_MODEL` is set

If something breaks, start by giving Copilot the exact error message rather than asking it to rewrite the feature.
