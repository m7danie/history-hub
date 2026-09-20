import { useState, useEffect, useCallback } from 'react';
import { Zap, Trophy, Flame, Clock, ArrowRight, RotateCcw } from 'lucide-react';
import type { PracticeQuestion } from './studySets';

interface TriviaGameProps {
  questions: PracticeQuestion[];
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

export function TriviaGame({ questions, onClose }: TriviaGameProps) {
  // Only use multiple choice and true/false for trivia
  const triviaQuestions = questions.filter(q => q.type === 'multiple_choice' || q.type === 'true_false');
  
  const [gameQuestions, setGameQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const currentQuestion = gameQuestions[currentIndex];

  // Initialize game
  useEffect(() => {
    const shuffled = shuffleArray(triviaQuestions).slice(0, 10);
    setGameQuestions(shuffled);
  }, []);

  // Timer
  useEffect(() => {
    if (gameOver || showResult || !currentQuestion) return;
    
    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }

    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameOver, showResult, currentQuestion]);

  const handleTimeout = useCallback(() => {
    setStreak(0);
    setShowResult(true);
  }, []);

  function selectAnswer(answer: string) {
    if (showResult || selectedAnswer) return;
    
    setSelectedAnswer(answer);
    const isCorrect = answer.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
    
    if (isCorrect) {
      const timeBonus = Math.floor(timeLeft * 10);
      const streakBonus = streak * 50;
      const pointsEarned = 100 + timeBonus + streakBonus;
      setScore(s => s + pointsEarned);
      setStreak(s => s + 1);
      setBestStreak(b => Math.max(b, streak + 1));
      setCorrectCount(c => c + 1);
    } else {
      setStreak(0);
    }
    
    setShowResult(true);
  }

  function nextQuestion() {
    if (currentIndex >= gameQuestions.length - 1) {
      setGameOver(true);
    } else {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setTimeLeft(15);
    }
  }

  function restartGame() {
    const shuffled = shuffleArray(triviaQuestions).slice(0, 10);
    setGameQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameOver(false);
    setTimeLeft(15);
  }

  if (triviaQuestions.length < 3) {
    return (
      <div className="trivia-container">
        <div className="trivia-empty">
          <Trophy size={48} />
          <h2>Not enough questions!</h2>
          <p>Generate a practice test first to play trivia. You need at least 3 multiple choice or true/false questions.</p>
          <button className="create-button primary-button" onClick={onClose}>Go Back</button>
        </div>
      </div>
    );
  }

  if (gameOver) {
    const percentage = Math.round((correctCount / gameQuestions.length) * 100);
    let rank = 'Novice';
    if (percentage >= 90) rank = 'History Master';
    else if (percentage >= 70) rank = 'Scholar';
    else if (percentage >= 50) rank = 'Student';
    
    return (
      <div className="trivia-container">
        <div className="trivia-results">
          <div className="results-trophy">
            <Trophy size={64} />
          </div>
          <h2>Game Over!</h2>
          <div className="results-rank">{rank}</div>
          <div className="results-final-score">
            <span className="final-score-number">{score.toLocaleString()}</span>
            <span className="final-score-label">points</span>
          </div>
          <div className="results-stats">
            <div className="stat-item">
              <Zap size={20} />
              <span>{correctCount}/{gameQuestions.length} correct</span>
            </div>
            <div className="stat-item">
              <Flame size={20} />
              <span>{bestStreak} best streak</span>
            </div>
          </div>
          <div className="results-actions">
            <button className="create-button" onClick={onClose}>Exit</button>
            <button className="create-button primary-button" onClick={restartGame}>
              <RotateCcw size={18} /> Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="trivia-container"><p>Loading...</p></div>;
  }

  const isCorrect = selectedAnswer?.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();

  return (
    <div className="trivia-container">
      <div className="trivia-header">
        <div className="trivia-score">
          <Zap size={20} />
          <span>{score.toLocaleString()}</span>
        </div>
        <div className="trivia-progress">
          {currentIndex + 1} / {gameQuestions.length}
        </div>
        <div className={`trivia-streak ${streak >= 3 ? 'hot' : ''}`}>
          <Flame size={20} />
          <span>{streak}</span>
        </div>
      </div>

      <div className={`trivia-timer ${timeLeft <= 5 ? 'low' : ''}`}>
        <Clock size={18} />
        <div className="timer-bar">
          <div className="timer-fill" style={{ width: `${(timeLeft / 15) * 100}%` }} />
        </div>
        <span>{timeLeft}s</span>
      </div>

      <div className={`trivia-question ${showResult ? (isCorrect ? 'correct' : 'incorrect') : ''}`}>
        <p>{currentQuestion.question}</p>
      </div>

      <div className="trivia-options">
        {currentQuestion.type === 'multiple_choice' && currentQuestion.options?.map((option, i) => (
          <button
            key={i}
            className={`trivia-option ${selectedAnswer === option ? 'selected' : ''} ${
              showResult && option.toLowerCase() === currentQuestion.correctAnswer.toLowerCase() ? 'correct' : ''
            } ${showResult && selectedAnswer === option && !isCorrect ? 'incorrect' : ''}`}
            onClick={() => selectAnswer(option)}
            disabled={showResult}
          >
            <span className="option-key">{String.fromCharCode(65 + i)}</span>
            {option}
          </button>
        ))}

        {currentQuestion.type === 'true_false' && ['True', 'False'].map((option) => (
          <button
            key={option}
            className={`trivia-option ${selectedAnswer === option ? 'selected' : ''} ${
              showResult && option.toLowerCase() === currentQuestion.correctAnswer.toLowerCase() ? 'correct' : ''
            } ${showResult && selectedAnswer === option && !isCorrect ? 'incorrect' : ''}`}
            onClick={() => selectAnswer(option)}
            disabled={showResult}
          >
            {option}
          </button>
        ))}
      </div>

      {showResult && (
        <div className={`trivia-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
          <div className="feedback-message">
            {isCorrect ? (
              <>Correct! +{100 + Math.floor(timeLeft * 10) + (streak > 0 ? (streak - 1) * 50 : 0)} points</>
            ) : selectedAnswer ? (
              <>Wrong! The answer was: {currentQuestion.correctAnswer}</>
            ) : (
              <>Time's up! The answer was: {currentQuestion.correctAnswer}</>
            )}
          </div>
          <button className="create-button primary-button" onClick={nextQuestion}>
            {currentIndex < gameQuestions.length - 1 ? (
              <>Next <ArrowRight size={18} /></>
            ) : (
              'See Results'
            )}
          </button>
        </div>
      )}

      <button className="trivia-exit" onClick={onClose}>Exit Game</button>
    </div>
  );
}
