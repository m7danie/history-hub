import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Plus, Sparkles, BookOpen, FileText, Gamepad2 } from 'lucide-react';
import { createStudySet, updateStudySetNotes, updateStudySetFlashCards, updateStudySetPracticeQuestions, updateStudySetTriviaQuestions, type StudySet, type FlashCard, type PracticeQuestion, type TriviaQuestion } from './studySets';
import { FlashCards } from './FlashCards';
import { PracticeTest } from './PracticeTest';
import { TriviaGame } from './TriviaGame';

export function CreateStudySetPage({ onCreated }: { onCreated: (set: StudySet) => void }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [nameInvalid, setNameInvalid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const submitted = useRef(false);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      setError('Please upload a PDF or image file.');
      return;
    }
    setExtracting(true);
    setError('');
    try {
      // Get session token
      const sessionRes = await fetch('/api/session');
      if (!sessionRes.ok) {
        throw new Error(`Backend not reachable (${sessionRes.status}). Make sure the AI server is running on port 8766.`);
      }
      const session = await sessionRes.json();
      
      // Upload file
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/extract-notes', {
        method: 'POST',
        headers: { 'X-History-Token': session.token },
        body: formData,
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server error: ${text.slice(0, 200)}`);
      }
      
      if (!response.ok) throw new Error(data.error || 'Failed to extract notes.');
      setNotes(prev => prev ? prev + '\n\n' + data.text : data.text);
    } catch (cause) {
      console.error('Upload error:', cause);
      setError(cause instanceof Error ? cause.message : 'Unable to extract notes from file.');
    } finally {
      setExtracting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitted.current) return;
    if (!name.trim()) {
      setNameInvalid(true);
      setError('Enter a name for your study set.');
      nameInput.current?.focus();
      return;
    }
    submitted.current = true;
    setSaving(true);
    setError('');
    try {
      onCreated(createStudySet(name, notes));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save. Please try again.');
      submitted.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="study-page">
      <a className="back-link" href="#/"><ArrowLeft size={16} aria-hidden="true" /> Back to home</a>
      <p className="eyebrow">A NEW CHAPTER</p>
      <h1>Create a study set</h1>
      <p className="subtitle">Give your notes a home. Start with a name and add your history notes.</p>
      <form className="study-panel study-form" onSubmit={submit} noValidate>
        <label htmlFor="set-name">Study set name <span>(required)</span></label>
        <input id="set-name" ref={nameInput} value={name} maxLength={150} required
          aria-invalid={nameInvalid} aria-describedby={nameInvalid ? 'create-error' : undefined}
          onChange={event => { setName(event.target.value); setNameInvalid(false); setError(''); }}
          placeholder="e.g. The French Revolution" autoComplete="off" />
        <label htmlFor="set-notes">History notes <span>(optional)</span></label>
        <p id="notes-hint" className="field-hint">Paste your class notes here, or upload handwritten notes below.</p>
        <textarea id="set-notes" value={notes} maxLength={500_000} rows={14}
          aria-describedby="notes-hint" placeholder="People, dates, events, and the connections between them…"
          onChange={event => setNotes(event.target.value)} />
        <div className="upload-section">
          <label htmlFor="file-upload" className="upload-label">
            <Plus size={18} aria-hidden="true" />
            {extracting ? 'Extracting text...' : 'Upload handwritten notes (PDF or image)'}
          </label>
          <input
            ref={fileInput}
            id="file-upload"
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileUpload}
            disabled={extracting}
            className="file-input"
          />
          <p className="field-hint">We'll use AI to read your handwriting and add it to your notes.</p>
        </div>
        {error && <p className="form-error" id="create-error" role="alert">{error}</p>}
        <div className="form-footer">
          <p>Saved in this browser on this device.<br />Clearing browser data removes your study sets.</p>
          <button className="create-button primary-button" type="submit" disabled={saving}>
            <Plus size={18} aria-hidden="true" />{saving ? 'Saving…' : 'Create Study Set'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function StudySetPage({ set, onUpdated }: {
  set: StudySet | undefined;
  onUpdated: (set: StudySet) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [studying, setStudying] = useState(false);
  const [takingTest, setTakingTest] = useState(false);
  const [playingTrivia, setPlayingTrivia] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingTest, setGeneratingTest] = useState(false);
  const [generatingTrivia, setGeneratingTrivia] = useState(false);
  const [generationSeconds, setGenerationSeconds] = useState(0);
  const [flashError, setFlashError] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const generationStartedAt = useRef<number | null>(null);

  useEffect(() => {
    if (editing) editor.current?.focus();
    else if (status) editButton.current?.focus();
  }, [editing, status]);

  useEffect(() => {
    const isGenerating = generating || generatingTest || generatingTrivia;
    if (!isGenerating) {
      generationStartedAt.current = null;
      setGenerationSeconds(0);
      return;
    }
    generationStartedAt.current ??= Date.now();
    const timer = window.setInterval(() => {
      setGenerationSeconds(Math.floor((Date.now() - (generationStartedAt.current ?? Date.now())) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [generating, generatingTest, generatingTrivia]);

  function saveNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!set) return;
    try {
      onUpdated(updateStudySetNotes(set.id, draft));
      setEditing(false);
      setError('');
      setStatus('Notes saved locally.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save notes. Please try again.');
    }
  }

  async function generateFlashCards() {
    if (!set || generating) return;
    if (!set.notes.trim()) {
      setFlashError('Add some notes first before generating flash cards.');
      return;
    }
    setGenerating(true);
    setFlashError('');
    try {
      const session = await fetch('/api/session').then(r => r.json());
      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-History-Token': session.token },
        body: JSON.stringify({ notes: set.notes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate flash cards.');
      const cards: FlashCard[] = data.cards.map((card: { front: string; back: string }) => ({
        id: crypto.randomUUID(),
        front: card.front,
        back: card.back,
      }));
      onUpdated(updateStudySetFlashCards(set.id, cards));
      setStudying(true);
    } catch (cause) {
      setFlashError(cause instanceof Error ? cause.message : 'Unable to generate flash cards. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function generatePracticeTest() {
    if (!set || generatingTest) return;
    if (!set.notes.trim()) {
      setFlashError('Add some notes first before generating a practice test.');
      return;
    }
    setGeneratingTest(true);
    setFlashError('');
    try {
      const session = await fetch('/api/session').then(r => r.json());
      const response = await fetch('/api/practice-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-History-Token': session.token },
        body: JSON.stringify({ notes: set.notes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate practice test.');
      const questions: PracticeQuestion[] = data.questions.map((q: { type: string; question: string; options?: string[]; correctAnswer: string; explanation: string }) => ({
        id: crypto.randomUUID(),
        type: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }));
      onUpdated(updateStudySetPracticeQuestions(set.id, questions));
      setTakingTest(true);
    } catch (cause) {
      setFlashError(cause instanceof Error ? cause.message : 'Unable to generate practice test. Please try again.');
    } finally {
      setGeneratingTest(false);
    }
  }

  async function generateTrivia() {
    if (!set || generatingTrivia) return;
    if (!set.notes.trim()) {
      setFlashError('Add some notes first before generating trivia.');
      return;
    }
    setGeneratingTrivia(true);
    setFlashError('');
    try {
      const sessionResponse = await fetch('/api/session');
      const session = await sessionResponse.json();
      if (!sessionResponse.ok || typeof session.token !== 'string') {
        throw new Error('The local server connection expired. Reload the page and try again.');
      }
      const response = await fetch('/api/trivia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-History-Token': session.token },
        body: JSON.stringify({ notes: set.notes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate trivia.');
      const questions: TriviaQuestion[] = data.questions.map((q: { question: string; options: [string, string, string, string]; correctAnswer: string; explanation: string }) => ({
        id: crypto.randomUUID(),
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }));
      onUpdated(updateStudySetTriviaQuestions(set.id, questions));
      setPlayingTrivia(true);
    } catch (cause) {
      setFlashError(cause instanceof Error ? cause.message : 'Unable to generate trivia. Please try again.');
    } finally {
      setGeneratingTrivia(false);
    }
  }

  if (studying && set?.flashCards?.length) {
    return (
      <div className="study-page">
        <FlashCards cards={set.flashCards} onClose={() => setStudying(false)} />
      </div>
    );
  }

  if (takingTest && set?.practiceQuestions?.length) {
    return (
      <div className="study-page">
        <PracticeTest questions={set.practiceQuestions} onClose={() => setTakingTest(false)} />
      </div>
    );
  }

  if (playingTrivia && set?.triviaQuestions?.length) {
    return (
      <div className="study-page">
        <TriviaGame questions={set.triviaQuestions} onClose={() => setPlayingTrivia(false)} />
      </div>
    );
  }

  return (
    <div className="study-page">
      <a className="back-link" href="#/"><ArrowLeft size={16} aria-hidden="true" /> Back to home</a>
      {set ? <>
        <p className="eyebrow">YOUR STUDY SET</p>
        <h1 className="set-title">{set.name}</h1>
        <p className="subtitle">Saved locally · Created {new Date(set.createdAt).toLocaleDateString()}</p>
        <div className="materials-action">
          {set.flashCards?.length ? (
            <button className="create-button primary-button" onClick={() => setStudying(true)}>
              <BookOpen size={18} aria-hidden="true" /> Study Flash Cards ({set.flashCards.length})
            </button>
          ) : null}
          <button
            className="create-button"
            onClick={generateFlashCards}
            disabled={generating || generatingTest || generatingTrivia}
            aria-describedby={flashError ? 'flash-error' : undefined}
          >
            <Sparkles size={18} aria-hidden="true" />
            {generating ? 'Generating…' : set.flashCards?.length ? 'Regenerate Flash Cards' : 'Generate Flash Cards'}
          </button>
        </div>
        <div className="materials-action" style={{ marginTop: '12px' }}>
          {set.practiceQuestions?.length ? (
            <>
              <button className="create-button primary-button" onClick={() => setTakingTest(true)}>
                <FileText size={18} aria-hidden="true" /> Take Practice Test ({set.practiceQuestions.length} questions)
              </button>
            </>
          ) : null}
          <button
            className="create-button"
            onClick={generatePracticeTest}
            disabled={generating || generatingTest || generatingTrivia}
          >
            <FileText size={18} aria-hidden="true" />
            {generatingTest ? 'Generating…' : set.practiceQuestions?.length ? 'Regenerate Practice Test' : 'Generate Practice Test'}
          </button>
        </div>
        <div className="materials-action">
          {set.triviaQuestions?.length ? (
            <button className="create-button primary-button" onClick={() => setPlayingTrivia(true)}>
              <Gamepad2 size={18} aria-hidden="true" /> Play Trivia ({set.triviaQuestions.length} questions)
            </button>
          ) : null}
          <button className="create-button" onClick={generateTrivia} disabled={generating || generatingTest || generatingTrivia}>
            <Gamepad2 size={18} aria-hidden="true" />
            {generatingTrivia ? 'Generating…' : set.triviaQuestions?.length ? 'Regenerate Trivia' : 'Generate Trivia'}
          </button>
        </div>
        {flashError && <p className="form-error" id="flash-error" role="alert" style={{ marginTop: '16px' }}>{flashError}</p>}
        {(generating || generatingTest || generatingTrivia) && (
          <div className="flashcard-generating" aria-live="polite">
            <div className="spinner" />
            <p className="subtitle">
              {generating ? 'Creating flash cards' : generatingTest ? 'Creating practice test' : 'Creating trivia'} from your notes… {generationSeconds}s elapsed.
              {generatingTrivia ? ' The local AI may take a few minutes, especially the first time.' : ' This may take a moment.'}
            </p>
          </div>
        )}
        <section className="study-panel" aria-labelledby="notes-title">
          <div className="notes-heading">
            <h2 id="notes-title">History notes</h2>
            {!editing && <button ref={editButton} className="create-button" onClick={() => {
              setDraft(set.notes); setError(''); setStatus(''); setEditing(true);
            }}>Edit Notes</button>}
          </div>
          {editing ? <form className="study-form" onSubmit={saveNotes}>
            <label htmlFor="edit-notes">Edit history notes</label>
            <p className="field-hint" id="edit-hint">Changes are saved only when you select Save Notes.</p>
            <textarea ref={editor} id="edit-notes" value={draft} maxLength={500_000} rows={14}
              aria-describedby="edit-hint" onChange={event => setDraft(event.target.value)} />
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="notes-actions">
              <button className="create-button" type="button" onClick={() => {
                setEditing(false); setError(''); setStatus('Changes canceled. Saved notes were not changed.');
              }}>Cancel</button>
              <button className="create-button primary-button" type="submit">Save Notes</button>
            </div>
          </form> : set.notes.trim() ? <div className="saved-notes">{set.notes}</div> : <p className="subtitle">No notes yet. Select Edit Notes to add some.</p>}
          <p className="notes-status" role="status">{status}</p>
        </section>
      </> : <>
        <h1>Study set not found</h1>
        <p className="subtitle">This study set isn’t saved in this browser. Return home to open a saved set or create one.</p>
      </>}
    </div>
  );
}
