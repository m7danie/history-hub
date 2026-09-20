import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Shuffle } from 'lucide-react';
import type { FlashCard } from './studySets';

interface FlashCardsProps {
  cards: FlashCard[];
  onClose: () => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function FlashCards({ cards, onClose }: FlashCardsProps) {
  const [deck, setDeck] = useState(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = deck[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex + 1) / deck.length) * 100 : 0;

  const goToNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(i => i + 1), 150);
    }
  }, [currentIndex, deck.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(i => i - 1), 150);
    }
  }, [currentIndex]);

  const flipCard = useCallback(() => setIsFlipped(f => !f), []);

  const shuffleDeck = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex(0);
    setDeck(shuffleArray(cards));
  }, [cards]);

  const resetDeck = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex(0);
    setDeck(cards);
  }, [cards]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        if (isFlipped) goToNext();
        else flipCard();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        flipCard();
      } else if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, goToNext, goToPrevious, flipCard, onClose]);

  if (cards.length === 0) {
    return (
      <div className="flashcard-container">
        <p className="subtitle">No flash cards available yet.</p>
        <button className="create-button" onClick={onClose}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="flashcard-container">
      <div className="flashcard-header">
        <span className="flashcard-count">{currentIndex + 1} / {deck.length}</span>
        <div className="flashcard-actions">
          <button className="flashcard-action" onClick={shuffleDeck} title="Shuffle cards">
            <Shuffle size={18} aria-hidden="true" /> Shuffle
          </button>
          <button className="flashcard-action" onClick={resetDeck} title="Reset order">
            <RotateCcw size={18} aria-hidden="true" /> Reset
          </button>
        </div>
      </div>

      <div className="flashcard-progress">
        <div className="flashcard-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div
        className={`flashcard ${isFlipped ? 'flipped' : ''}`}
        onClick={flipCard}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Answer side. Click to flip back.' : 'Question side. Click to reveal answer.'}
        onKeyDown={e => { if (e.key === 'Enter') flipCard(); }}
      >
        <div className="flashcard-inner">
          <div className="flashcard-front">
            <span className="flashcard-label">Question</span>
            <p>{currentCard.front}</p>
            <span className="flashcard-hint">Click or press Space to flip</span>
          </div>
          <div className="flashcard-back">
            <span className="flashcard-label">Answer</span>
            <p>{currentCard.back}</p>
            <span className="flashcard-hint">Click to flip back</span>
          </div>
        </div>
      </div>

      <div className="flashcard-nav">
        <button
          className="flashcard-nav-btn"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          aria-label="Previous card"
        >
          <ArrowLeft size={20} aria-hidden="true" /> Previous
        </button>
        <button
          className="flashcard-nav-btn primary"
          onClick={() => { if (isFlipped) goToNext(); else flipCard(); }}
          disabled={isFlipped && currentIndex === deck.length - 1}
          aria-label={isFlipped ? 'Next card' : 'Flip card'}
        >
          {isFlipped ? (
            currentIndex === deck.length - 1 ? 'Done!' : <>Next <ArrowRight size={20} aria-hidden="true" /></>
          ) : 'Flip'}
        </button>
      </div>

      <p className="flashcard-keyboard-hint">
        Keyboard: ← → to navigate · Space or ↑↓ to flip · Esc to exit
      </p>

      <button className="create-button flashcard-close" onClick={onClose}>
        <ArrowLeft size={16} aria-hidden="true" /> Back to Study Set
      </button>
    </div>
  );
}
