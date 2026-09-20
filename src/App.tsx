import { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, Plus, Sparkles, Trash2 } from 'lucide-react';
import { loadStudySets, syncToLocalCache, deleteStudySetLocal, type StudySet } from './studySets';
import { fetchStudySets, deleteStudySetFromBackend } from './api';
import { CreateStudySetPage, StudySetPage } from './StudySetPages';

function Header() {
  return (
    <header className="header">
      <a className="brand" href="#/" aria-label="History Hub home">
        <span className="brand-icon"><BookOpen size={23} aria-hidden="true" /></span>
        <span>History <span className="brand-light">Hub</span></span>
      </a>
      <span className="header-note">A fresh perspective on the past.</span>
    </header>
  );
}

export default function App() {
  const [path, setPath] = useState(() => location.hash.slice(1) || '/');
  const [sets, setSets] = useState<StudySet[]>([]);
  const [storageError, setStorageError] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; setId: string } | null>(null);

  async function handleDeleteSet(setId: string) {
    const setToDelete = sets.find(s => s.id === setId);
    if (!setToDelete) return;
    
    // Close menu first
    setContextMenu(null);
    
    // Then confirm
    if (!confirm(`Delete "${setToDelete.name}"? This cannot be undone.`)) return;
    
    try {
      await deleteStudySetFromBackend(setId);
      deleteStudySetLocal(setId);
      setSets(prev => prev.filter(s => s.id !== setId));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete study set');
    }
  }

  function handleContextMenu(e: React.MouseEvent, setId: string) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, setId });
  }

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  useEffect(() => {
    const refreshFromCache = () => {
      try { setSets(loadStudySets()); setStorageError(''); }
      catch { setStorageError('Saved study sets could not be loaded.'); }
    };
    
    const loadFromBackend = async () => {
      try {
        const backendSets = await fetchStudySets();
        syncToLocalCache(backendSets);
        setSets(backendSets);
        setStorageError('');
      } catch {
        // Backend unavailable, fall back to local cache
        refreshFromCache();
      }
    };
    
    const navigate = () => {
      if (location.hash === '#main') return;
      setPath(location.hash.slice(1) || '/');
      refreshFromCache();
    };
    
    // Load from backend on startup
    loadFromBackend();
    
    window.addEventListener('hashchange', navigate);
    window.addEventListener('storage', refreshFromCache);
    return () => {
      window.removeEventListener('hashchange', navigate);
      window.removeEventListener('storage', refreshFromCache);
    };
  }, []);

  useEffect(() => {
    document.querySelector<HTMLElement>('#main')?.focus();
    window.scrollTo(0, 0);
  }, [path]);

  function onCreated(set: StudySet) {
    setSets(previous => [set, ...previous]);
    location.hash = `/sets/${set.id}`;
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main" className="main" tabIndex={-1}>
        {storageError && <p className="form-error" role="alert">{storageError}</p>}
        {path === '/new' ? <CreateStudySetPage onCreated={onCreated} />
          : path.startsWith('/sets/') ? <StudySetPage key={path} set={sets.find(set => set.id === path.slice(6))}
              onUpdated={updated => setSets(previous => previous.map(set => set.id === updated.id ? updated : set))} />
          : <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">YOUR STUDY SPACE</p>
            <h1>Welcome to History Hub.</h1>
            <p className="subtitle">A little curiosity. A whole world to discover.</p>
          </div>
          <span className="chapter-label">CHAPTER 01 <span /> A NEW BEGINNING</span>
        </div>

        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="hero-eyebrow"><span /> THE PAST, WITH POSSIBILITY</p>
            <h2 id="hero-title">Big history.<br /><em>Your next chapter.</em></h2>
            <p className="hero-description">
              Every great understanding starts with a little curiosity.
              Make room for yours in a study space that feels like you.
            </p>
            <button className="create-button" onClick={() => { location.hash = '/new'; }}>
              <Plus size={18} aria-hidden="true" /> Create Study Set
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
            <p className="hero-caption">A fresh start for your history studies.</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-spark"><Sparkles size={26} strokeWidth={1.2} /></div>
            <div className="paper paper-back"><span>THE BIGGER PICTURE</span></div>
            <div className="paper paper-front">
              <div className="paper-top"><BookOpen size={22} strokeWidth={1.3} /><span>FIELD NOTES / 001</span></div>
              <div className="paper-title">Understand<br />the past.<br /><em>See more.</em></div>
              <div className="paper-lines"><span /><span /><span /></div>
              <div className="paper-bottom">A CURIOUS MIND GOES A LONG WAY <span>↗</span></div>
            </div>
            <div className="art-stamp"><span>STAY</span><Sparkles size={21} /><span>CURIOUS</span></div>
          </div>
        </section>

        {sets.length > 0 ? <section className="saved-sets" aria-labelledby="saved-title">
          <h2 id="saved-title">Your study sets</h2>
          <div className="saved-set-grid">{sets.map(set => <a 
            className="saved-set-link" 
            key={set.id} 
            href={`#/sets/${set.id}`}
            onContextMenu={(e) => handleContextMenu(e, set.id)}
          >
            <BookOpen size={23} aria-hidden="true" />
            <span><strong>{set.name}</strong><small>Created {new Date(set.createdAt).toLocaleDateString()}</small></span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>)}</div>
        </section> : <section className="beginning" aria-labelledby="beginning-title">
          <span className="beginning-icon"><BookOpen size={23} strokeWidth={1.5} aria-hidden="true" /></span>
          <div>
            <h2 id="beginning-title">A blank page. Endless possibilities.</h2>
            <p>This is the beginning of your study space. Your next chapter starts here.</p>
          </div>
          <span className="beginning-detail">MAKE IT YOURS <ArrowUpRight size={16} aria-hidden="true" /></span>
        </section>}
        </>}
      </main>
      <footer className="footer"><span>History Hub</span><p>MADE FOR CURIOUS MINDS.</p><span>One chapter at a time.</span></footer>
      
      {contextMenu && (
        <div 
          className="context-menu" 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => handleDeleteSet(contextMenu.setId)}>
            <Trash2 size={16} /> Delete Study Set
          </button>
        </div>
      )}
    </>
  );
}
