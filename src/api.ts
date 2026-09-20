/**
 * API client for backend storage operations.
 * Study sets are saved locally on your Mac via SQLite.
 */

let token: string | null = null;

async function getToken(): Promise<string> {
  if (!token) {
    const res = await fetch('/api/session');
    const data = await res.json();
    token = data.token;
  }
  return token!;
}

export async function fetchStudySets(): Promise<import('./studySets').StudySet[]> {
  const res = await fetch('/api/sets');
  if (!res.ok) throw new Error('Failed to load study sets');
  const data = await res.json();
  return data.sets;
}

export async function saveStudySetToBackend(set: import('./studySets').StudySet): Promise<void> {
  const t = await getToken();
  const res = await fetch('/api/sets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-History-Token': t },
    body: JSON.stringify(set),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to save study set');
  }
}

export async function deleteStudySetFromBackend(id: string): Promise<void> {
  // Always get fresh token
  const sessionRes = await fetch('/api/session');
  const session = await sessionRes.json();
  
  const res = await fetch(`/api/sets/${id}/delete`, {
    method: 'POST',
    headers: { 'X-History-Token': session.token },
  });
  if (!res.ok) {
    const text = await res.text();
    let error = 'Failed to delete study set';
    try {
      const data = JSON.parse(text);
      error = data.error || error;
    } catch {}
    console.error('Delete error:', res.status, text);
    throw new Error(error);
  }
}
