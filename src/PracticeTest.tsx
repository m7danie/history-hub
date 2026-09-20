import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import type { PracticeQuestion } from './studySets';

interface PracticeTestProps {
  questions: PracticeQuestion[];
  onClose: () => void;
}

interface Answer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean | null;
}

export function PracticeTest({ questions, onClose }: PracticeTestProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [shortAnswer, setShortAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [testComplete, setTestComplete] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id);
  const progress = ((currentIndex + 1) / questions.length) * 100;

  function submitAnswer() {
    if (!currentQuestion) return;
    
    let userAnswer = '';
    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') {
      userAnswer = selectedOption;
    } else {
      userAnswer = shortAnswer;
    }
    
    if (!userAnswer.trim()) return;
    
    const isCorrect = currentQuestion.type === 'short_answer'
      ? null // Short answers need manual review
      : userAnswer.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
    
    setAnswers(prev => [...prev.filter(a => a.questionId !== currentQuestion.id), {
      questionId: currentQuestion.id,
      userAnswer,
      isCorrect,
    }]);
    setShowResult(true);
  }

  function nextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedOption('');
      setShortAnswer('');
      setShowResult(false);
    } else {
      setTestComplete(true);
    }
  }

  function restartTest() {
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedOption('');
    setShortAnswer('');
    setShowResult(false);
    setTestComplete(false);
  }

  if (questions.length === 0) {
    return (
      <div className="practice-container">
        <p className="subtitle">No practice questions available yet.</p>
        <button className="create-button" onClick={onClose}>Go Back</button>
      </div>
    );
  }

  if (testComplete) {
    const correctCount = answers.filter(a => a.isCorrect === true).length;
    const totalGraded = answers.filter(a => a.isCorrect !== null).length;
    const percentage = totalGraded > 0 ? Math.round((correctCount / totalGraded) * 100) : 0;
    
    return (
      <div className="practice-container">
        <div className="practice-results">
          <h2>Test Complete!</h2>
          <div className="results-score">
            <span className="score-number">{percentage}%</span>
            <span className="score-label">{correctCount} / {totalGraded} correct</span>
          </div>
          {answers.filter(a => a.isCorrect === null).length > 0 && (
            <p className="subtitle">
              {answers.filter(a => a.isCorrect === null).length} short answer question(s) need manual review.
            </p>
          )}
          <div className="results-actions">
            <button className="create-button" onClick={restartTest}>
              <RotateCcw size={18} /> Retake Test
            </button>
            <button className="create-button primary-button" onClick={onClose}>
              Done
            </button>
          </div>
          
          <div className="results-review">
            <h3>Review Answers</h3>
            {questions.map((q, i) => {
              const answer = answers.find(a => a.questionId === q.id);
              return (
                <div key={q.id} className={`review-item ${answer?.isCorrect === true ? 'correct' : answer?.isCorrect === false ? 'incorrect' : 'pending'}`}>
                  <div className="review-header">
                    <span className="review-number">Q{i + 1}</span>
                    {answer?.isCorrect === true && <CheckCircle size={18} />}
                    {answer?.isCorrect === false && <XCircle size={18} />}
                  </div>
                  <p className="review-question">{q.question}</p>
                  <p className="review-answer">
                    <strong>Your answer:</strong> {answer?.userAnswer || '(not answered)'}
                  </p>
                  <p className="review-correct">
                    <strong>Correct answer:</strong> {q.correctAnswer}
                  </p>
                  <p className="review-explanation">{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="practice-container">
      <div className="practice-header">
        <span className="practice-count">Question {currentIndex + 1} of {questions.length}</span>
        <span className="practice-type">{currentQuestion.type.replace('_', ' ')}</span>
      </div>

      <div className="practice-progress">
        <div className="practice-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="practice-question">
        <p>{currentQuestion.question}</p>
      </div>

      {!showResult ? (
        <div className="practice-options">
          {currentQuestion.type === 'multiple_choice' && currentQuestion.options?.map((option, i) => (
            <button
              key={i}
              className={`practice-option ${selectedOption === option ? 'selected' : ''}`}
              onClick={() => setSelectedOption(option)}
            >
              <span className="option-letter">{String.fromCharCode(65 + i)}</span>
              {option}
            </button>
          ))}

          {currentQuestion.type === 'true_false' && (
            <>
              <button
                className={`practice-option ${selectedOption === 'True' ? 'selected' : ''}`}
                onClick={() => setSelectedOption('True')}
              >
                True
              </button>
              <button
                className={`practice-option ${selectedOption === 'False' ? 'selected' : ''}`}
                onClick={() => setSelectedOption('False')}
              >
                False
              </button>
            </>
          )}

          {currentQuestion.type === 'short_answer' && (
            <textarea
              className="practice-short-answer"
              value={shortAnswer}
              onChange={(e) => setShortAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
            />
          )}

          <button
            className="create-button primary-button practice-submit"
            onClick={submitAnswer}
            disabled={!selectedOption && !shortAnswer.trim()}
          >
            Submit Answer
          </button>
        </div>
      ) : (
        <div className="practice-feedback">
          {currentAnswer?.isCorrect === true && (
            <div className="feedback-correct">
              <CheckCircle size={24} />
              <span>Correct!</span>
            </div>
          )}
          {currentAnswer?.isCorrect === false && (
            <div className="feedback-incorrect">
              <XCircle size={24} />
              <span>Incorrect</span>
            </div>
          )}
          {currentAnswer?.isCorrect === null && (
            <div className="feedback-pending">
              <span>Answer submitted - review when complete</span>
            </div>
          )}
          
          <div className="feedback-details">
            <p><strong>Your answer:</strong> {currentAnswer?.userAnswer}</p>
            <p><strong>Correct answer:</strong> {currentQuestion.correctAnswer}</p>
            <p className="feedback-explanation">{currentQuestion.explanation}</p>
          </div>

          <button className="create-button primary-button" onClick={nextQuestion}>
            {currentIndex < questions.length - 1 ? (
              <>Next Question <ArrowRight size={18} /></>
            ) : (
              'Finish Test'
            )}
          </button>
        </div>
      )}

      <button className="create-button practice-close" onClick={onClose}>
        <ArrowLeft size={16} /> Exit Test
      </button>
    </div>
  );
}
