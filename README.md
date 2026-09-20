# History Hub

History Hub is a local-first history study app built with React, TypeScript, Vite, and a small Python backend. Students can create study sets from notes, save them locally, and generate study materials with a locally running Ollama model.

## Current features

- Create, edit, open, and delete history study sets
- Persist study sets in a local SQLite database
- Enter notes manually
- Upload handwritten notes/images or PDFs for local AI transcription
- Generate flash cards from notes
- Generate practice-test questions from notes
- Study with flash cards
- Take practice tests
- Play a trivia mode using generated questions
- Run AI features locally through Ollama without a paid cloud AI key

## Architecture

### Frontend

React + TypeScript + Vite.

Important files:

- `src/App.tsx` — app shell and home page
- `src/StudySetPages.tsx` — study-set creation/editing and study-material actions
- `src/FlashCards.tsx` — flash-card study mode
- `src/PracticeTest.tsx` — practice tests
- `src/TriviaGame.tsx` — trivia mode
- `src/studySets.ts` — study-set types/helpers
- `src/api.ts` — frontend requests to the local backend
- `src/styles.css` — app styles

### Local backend

The Python server runs on `127.0.0.1:8766` and provides local study-set storage and AI endpoints.

Important files:

- `server/app.py` — local HTTP API
- `server/storage.py` — SQLite persistence
- `server/ai_service.py` — Ollama integration, structured study-material generation, and note extraction

Study-set data is stored in:

```text
~/.history-hub/study-sets.sqlite3
```

The default Ollama model is:

```text
gemma3:12b
```

Override it by setting `OLLAMA_MODEL` before starting the backend.

## Run locally

### Requirements

- Node.js/npm, or the optional bundled Node runtime when present
- Python 3
- Python packages `pydantic` and `PyMuPDF`
- Ollama running locally for AI features
- the configured Ollama model downloaded locally

### 1. Start Ollama

Open the Ollama app and make sure the model used by History Hub is available.

### 2. Start the local backend

From the project folder:

```sh
sh scripts/ai.sh
```

The backend should report that it is ready at `http://127.0.0.1:8766`.

### 3. Start the frontend

In a second terminal:

```sh
npm install
npm run dev
```

If Node/npm is not installed system-wide but the bundled runtime is present:

```sh
sh scripts/npm.sh install
sh scripts/npm.sh run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`.

## Tests and production build

```sh
npm test
npm run build
```

Preview a production build with:

```sh
npm run preview
```

## AI-assisted maintenance

This repository is prepared for inexpensive AI-assisted coding.

- `.github/copilot-instructions.md` gives GitHub Copilot permanent project instructions.
- `AGENTS.md` gives other coding agents a short repository guide.
- `START-HERE.md` explains a safe, low-usage workflow for making changes.

AI coding tools should focus on the source folders and avoid dependency/runtime/generated folders such as `node_modules/`, `.venv/`, `.runtime/`, `dist/`, and Python caches unless a task specifically requires them.

## Privacy and cost model

History Hub's current study-generation path is local. Notes are sent from the local web app to the local Python server, which calls the locally running Ollama service. No paid cloud AI API is required by the current implementation.

As with any local app, review changes before committing them and do not add API keys or secrets to frontend source code.
