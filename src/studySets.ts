import { saveStudySetToBackend } from './api';

export interface FlashCard {
  id: string;
  front: string;
  back: string;
}

export interface PracticeQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface StudySet {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
  flashCards?: FlashCard[];
  practiceQuestions?: PracticeQuestion[];
}

const PREFIX = 'history-hub.study-set.v1.';

// Local cache for fast synchronous access
export function loadStudySets(): StudySet[] {
  const sets: StudySet[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (
      !value || typeof value !== 'object' ||
      !('id' in value) || typeof value.id !== 'string' ||
      !('name' in value) || typeof value.name !== 'string' ||
      !('notes' in value) || typeof value.notes !== 'string' ||
      !('createdAt' in value) || typeof value.createdAt !== 'string'
    ) throw new Error('Saved study data could not be read. Your original data has not been changed.');
    sets.push(value as StudySet);
  }
  return sets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Sync backend sets to local cache
export function syncToLocalCache(sets: StudySet[]): void {
  // Clear old cache
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Add new sets
  sets.forEach(set => {
    localStorage.setItem(PREFIX + set.id, JSON.stringify(set));
  });
}

export function createStudySet(name: string, notes: string): StudySet {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('Enter a name for your study set.');
  if (trimmedName.length > 150) throw new Error('Use a name of 150 characters or fewer.');
  if (notes.length > 500_000) throw new Error('Keep notes under 500,000 characters.');
  const set = { id: crypto.randomUUID(), name: trimmedName, notes, createdAt: new Date().toISOString() };
  return saveStudySet(set);
}

export function updateStudySetNotes(id: string, notes: string): StudySet {
  if (notes.length > 500_000) throw new Error('Keep notes under 500,000 characters.');
  const existing = loadStudySets().find(set => set.id === id);
  if (!existing) throw new Error('Study set not found. Your changes have not been saved.');
  return saveStudySet({ ...existing, notes });
}

export function updateStudySetFlashCards(id: string, flashCards: FlashCard[]): StudySet {
  const existing = loadStudySets().find(set => set.id === id);
  if (!existing) throw new Error('Study set not found. Flash cards have not been saved.');
  return saveStudySet({ ...existing, flashCards });
}

export function updateStudySetPracticeQuestions(id: string, practiceQuestions: PracticeQuestion[]): StudySet {
  const existing = loadStudySets().find(set => set.id === id);
  if (!existing) throw new Error('Study set not found. Practice questions have not been saved.');
  return saveStudySet({ ...existing, practiceQuestions });
}

export function deleteStudySetLocal(id: string): void {
  localStorage.removeItem(PREFIX + id);
}

function saveStudySet(set: StudySet): StudySet {
  // Save to local cache immediately
  try {
    localStorage.setItem(PREFIX + set.id, JSON.stringify(set));
  } catch {
    throw new Error('Your study set could not be saved. Browser storage may be full or unavailable.');
  }
  
  // Sync to backend (fire and forget, but log errors)
  saveStudySetToBackend(set).catch(err => {
    console.error('Failed to sync to backend:', err);
  });
  
  return set;
}
