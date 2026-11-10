/**
 * QuizModal.tsx
 *
 * Modal Kuis Berhadiah Koin:
 * 1. Kategori Out of Topic (Spesial Developer): 1.000 Koin per pertanyaan.
 * 2. Kategori Pengetahuan Umum: 10 - 50 Koin per pertanyaan (Mudah: 15, Sedang: 25, Sulit: 50).
 */

import React, { useState, useMemo } from 'react';
import {
  QUIZ_QUESTIONS,
  type QuizCategory,
  type QuizDifficulty,
} from '../../game/quiz/quizData';
import { useCustomization } from '../../game/customization';
import { audio } from '../../game/audio/audio';

const STORAGE_KEY_ANSWERED = 'olivia-ludo:quiz:answered:v1';

function loadAnsweredQuestions(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ANSWERED);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {
    /* abaikan error localStorage */
  }
  return new Set();
}

function saveAnsweredQuestions(set: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY_ANSWERED, JSON.stringify(Array.from(set)));
  } catch {
    /* abaikan error localStorage */
  }
}

interface QuizModalProps {
  onClose: () => void;
}

export function QuizModal({ onClose }: QuizModalProps): React.ReactElement {
  const { addCoins, state } = useCustomization();
  const [activeCategory, setActiveCategory] = useState<QuizCategory>('out_of_topic');
  const [difficultyFilter, setDifficultyFilter] = useState<QuizDifficulty | 'all'>('all');
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(loadAnsweredQuestions);

  // Selected question in active category
  const [activeQuestionId, setActiveQuestionId] = useState<string>('oot-1');
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [rewardClaimed, setRewardClaimed] = useState<number | null>(null);

  // Filtered question list for active category
  const questionList = useMemo(() => {
    return QUIZ_QUESTIONS.filter((q) => {
      if (q.category !== activeCategory) return false;
      if (activeCategory === 'general' && difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) {
        return false;
      }
      return true;
    });
  }, [activeCategory, difficultyFilter]);

  // Current question object
  const currentQuestion = useMemo(() => {
    return QUIZ_QUESTIONS.find((q) => q.id === activeQuestionId) ?? questionList[0] ?? QUIZ_QUESTIONS[0]!;
  }, [activeQuestionId, questionList]);

  // Switch question reset state
  const handleSelectQuestion = (qId: string) => {
    setActiveQuestionId(qId);
    setSelectedOptions([]);
    setSubmitted(false);
    setIsCorrect(false);
    setRewardClaimed(null);
  };

  // Switch category reset state
  const handleSwitchCategory = (cat: QuizCategory) => {
    setActiveCategory(cat);
    const firstInCat = QUIZ_QUESTIONS.find((q) => q.category === cat);
    if (firstInCat) {
      handleSelectQuestion(firstInCat.id);
    }
  };

  const handleToggleOption = (index: number) => {
    if (submitted && isCorrect) return; // Sudah terjawab benar, jangan ubah
    if (currentQuestion.multiSelect) {
      // Soal pilihan ganda lebih dari 1 (misal pilih 2 jawaban benar)
      setSelectedOptions((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
      );
    } else {
      setSelectedOptions([index]);
    }
    // Reset submission state saat opsi diubah
    if (submitted && !isCorrect) {
      setSubmitted(false);
    }
  };

  const handleSubmit = () => {
    if (selectedOptions.length === 0) return;

    const correct = currentQuestion.correctIndices;
    // Cek apakah opsi yang dipilih sama persis dengan kunci jawaban
    const hasSameLength = selectedOptions.length === correct.length;
    const hasAllCorrect = selectedOptions.every((idx) => correct.includes(idx));
    const win = hasSameLength && hasAllCorrect;

    setSubmitted(true);
    setIsCorrect(win);

    if (win) {
      audio.cue('win');
      // Jika belum pernah diklaim sebelumnya, beri reward koin
      if (!answeredIds.has(currentQuestion.id)) {
        addCoins(currentQuestion.reward);
        setRewardClaimed(currentQuestion.reward);
        const updated = new Set(answeredIds).add(currentQuestion.id);
        setAnsweredIds(updated);
        saveAnsweredQuestions(updated);
      } else {
        setRewardClaimed(0); // Sudah pernah diklaim sebelumnya
      }
    } else {
      audio.cue('dice');
    }
  };

  const handleNextQuestion = () => {
    const currentIndex = questionList.findIndex((q) => q.id === currentQuestion.id);
    if (currentIndex >= 0 && currentIndex < questionList.length - 1) {
      handleSelectQuestion(questionList[currentIndex + 1]!.id);
    }
  };

  return (
    <div className="quiz-modal-backdrop" role="dialog" aria-modal="true" aria-label="Kuis Berhadiah Koin">
      <div className="quiz-modal">
        {/* Header Modal */}
        <header className="quiz-header">
          <div className="quiz-header__title-group">
            <span className="quiz-header__icon" aria-hidden="true">🧠</span>
            <div>
              <h2 className="quiz-header__title">Kuis Tambah Koin</h2>
              <p className="quiz-header__sub">Jawab kuis dengan benar untuk mendapatkan saldo koin!</p>
            </div>
          </div>

          <div className="quiz-header__right">
            <div className="cust-coin-pill cust-coin-pill--static" aria-label={`Saldo koin: ${state.coins}`}>
              <span className="cust-coin-pill__dot" aria-hidden="true">🪙</span>
              <span className="cust-coin-pill__amount">{state.coins} Coins</span>
            </div>
            <button
              type="button"
              className="quiz-close-btn"
              onClick={onClose}
              aria-label="Tutup kuis"
              title="Tutup"
            >
              ✕
            </button>
          </div>
        </header>

        {/* 2 Kategori Utama: Out of Topic & Pengetahuan Umum */}
        <nav className="quiz-category-tabs" aria-label="Pilih Kategori Kuis">
          <button
            type="button"
            className={`quiz-cat-tab quiz-cat-tab--oot${activeCategory === 'out_of_topic' ? ' quiz-cat-tab--active' : ''}`}
            onClick={() => handleSwitchCategory('out_of_topic')}
            aria-pressed={activeCategory === 'out_of_topic'}
          >
            <span className="quiz-cat-tab__icon">🌟</span>
            <div className="quiz-cat-tab__text">
              <span className="quiz-cat-tab__label">Out of Topic (Developer)</span>
              <span className="quiz-cat-tab__badge">1.000 Koin / Soal 💰</span>
            </div>
          </button>

          <button
            type="button"
            className={`quiz-cat-tab quiz-cat-tab--gen${activeCategory === 'general' ? ' quiz-cat-tab--active' : ''}`}
            onClick={() => handleSwitchCategory('general')}
            aria-pressed={activeCategory === 'general'}
          >
            <span className="quiz-cat-tab__icon">📚</span>
            <div className="quiz-cat-tab__text">
              <span className="quiz-cat-tab__label">Pengetahuan Umum</span>
              <span className="quiz-cat-tab__badge">10 – 50 Koin 🪙</span>
            </div>
          </button>
        </nav>

        {/* Filter Tingkat Kesulitan (Khusus Pengetahuan Umum) */}
        {activeCategory === 'general' && (
          <div className="quiz-diff-filters" aria-label="Filter Kesulitan">
            <span className="quiz-diff-label">Tingkat Kesulitan:</span>
            {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                className={`quiz-diff-btn${difficultyFilter === diff ? ' quiz-diff-btn--active' : ''}`}
                onClick={() => setDifficultyFilter(diff)}
              >
                {diff === 'all' && 'Semua'}
                {diff === 'easy' && 'Mudah (15 🪙)'}
                {diff === 'medium' && 'Sedang (25 🪙)'}
                {diff === 'hard' && 'Sulit (50 🪙)'}
              </button>
            ))}
          </div>
        )}

        {/* Nomor Soal Carousel / Chips */}
        <div className="quiz-chips-scroller" aria-label="Daftar Soal">
          {questionList.map((q, idx) => {
            const isAnswered = answeredIds.has(q.id);
            const isCurrent = q.id === currentQuestion.id;
            return (
              <button
                key={q.id}
                type="button"
                className={`quiz-chip${isCurrent ? ' quiz-chip--current' : ''}${isAnswered ? ' quiz-chip--completed' : ''}`}
                onClick={() => handleSelectQuestion(q.id)}
                title={`Soal ${idx + 1}: ${q.reward} Koin`}
              >
                <span>{idx + 1}</span>
                {isAnswered && <span className="quiz-chip__check">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Card Soal Aktif */}
        <div className="quiz-card">
          <div className="quiz-card__header">
            <span className={`quiz-badge quiz-badge--${currentQuestion.difficulty}`}>
              {currentQuestion.category === 'out_of_topic' ? '⭐ SPESIAL DEVELOPER' : currentQuestion.difficulty.toUpperCase()}
            </span>
            <span className="quiz-reward-pill">
              🪙 +{currentQuestion.reward} Koin
            </span>
          </div>

          <h3 className="quiz-card__question">
            {currentQuestion.question}
          </h3>

          {currentQuestion.multiSelect && (
            <p className="quiz-card__hint">
              ℹ️ <em>Soal ini memiliki lebih dari 1 jawaban benar. Centang semua jawaban yang benar lalu tekan Kirim.</em>
            </p>
          )}

          {/* Pilihan Jawaban */}
          <div className="quiz-options">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedOptions.includes(idx);
              const isCorrectOption = currentQuestion.correctIndices.includes(idx);
              let optionClass = 'quiz-option';
              if (isSelected) optionClass += ' quiz-option--selected';
              if (submitted) {
                if (isCorrectOption) optionClass += ' quiz-option--correct';
                else if (isSelected && !isCorrectOption) optionClass += ' quiz-option--wrong';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  className={optionClass}
                  onClick={() => handleToggleOption(idx)}
                  disabled={submitted && isCorrect}
                >
                  <span className="quiz-option__marker">
                    {currentQuestion.multiSelect ? (
                      <span className={`quiz-checkbox${isSelected ? ' quiz-checkbox--checked' : ''}`}>
                        {isSelected ? '✓' : ''}
                      </span>
                    ) : (
                      <span className="quiz-option__letter">{String.fromCharCode(65 + idx)}</span>
                    )}
                  </span>
                  <span className="quiz-option__text">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback Hasil Jawaban */}
          {submitted && (
            <div className={`quiz-feedback quiz-feedback--${isCorrect ? 'correct' : 'wrong'}`}>
              <div className="quiz-feedback__content">
                <span className="quiz-feedback__icon">{isCorrect ? '🎉' : '❌'}</span>
                <div>
                  <h4 className="quiz-feedback__title">
                    {isCorrect ? 'Luar Biasa, Jawaban Kamu Benar!' : 'Jawaban Kurang Tepat!'}
                  </h4>
                  {isCorrect && rewardClaimed !== null && rewardClaimed > 0 && (
                    <p className="quiz-feedback__reward">
                      Selamat! Kamu mendapatkan <strong>+{rewardClaimed.toLocaleString()} Koin</strong>! 🪙
                    </p>
                  )}
                  {isCorrect && rewardClaimed === 0 && (
                    <p className="quiz-feedback__reward">
                      (Soal ini sudah pernah kamu jawab sebelumnya)
                    </p>
                  )}
                  {currentQuestion.explanation && (
                    <p className="quiz-feedback__desc">{currentQuestion.explanation}</p>
                  )}
                  {!isCorrect && (
                    <p className="quiz-feedback__desc">Jangan menyerah! Coba pilih jawaban lain dan tekan periksa kembali.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="quiz-actions">
            {!submitted || !isCorrect ? (
              <button
                type="button"
                className="hud__button btn--lg quiz-submit-btn"
                onClick={handleSubmit}
                disabled={selectedOptions.length === 0}
              >
                Periksa Jawaban
              </button>
            ) : (
              <button
                type="button"
                className="hud__button btn--lg quiz-next-btn"
                onClick={handleNextQuestion}
              >
                Soal Berikutnya ➔
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
