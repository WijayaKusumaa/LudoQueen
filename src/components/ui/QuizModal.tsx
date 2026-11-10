/**
 * QuizModal.tsx
 *
 * Modal Kuis Berhadiah Koin:
 * 1. Kategori Out of Topic (Spesial Developer): 1.000 Koin per pertanyaan.
 *    - Soal 1: Pilihan Ganda Multi-select
 *    - Soal 2: Pilihan Ganda Tunggal
 *    - Soal 3: Esai / Ketik Jawaban (Kepanjangan SASIMO)
 * 2. Kategori Pengetahuan Umum: 10 - 50 Koin per pertanyaan (Mudah: 15, Sedang: 25, Sulit: 50).
 * 3. Aturan Baru: Jika salah menjawab, soal otomatis TERKUNCI dan tidak dapat diulang.
 *    Untuk membuka kunci, pemain harus menjawab pertanyaan rahasia yang hanya Oliv dan Wijaya yang tahu.
 */

import React, { useState, useMemo } from 'react';
import {
  QUIZ_QUESTIONS,
  SECRET_UNLOCK_INFO,
  type QuizCategory,
  type QuizDifficulty,
} from '../../game/quiz/quizData';
import { useCustomization } from '../../game/customization';
import { audio } from '../../game/audio/audio';

const STORAGE_KEY_ANSWERED = 'olivia-ludo:quiz:answered:v1';
const STORAGE_KEY_LOCKED = 'olivia-ludo:quiz:locked:v1';

function loadStoredSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {
    /* abaikan error localStorage */
  }
  return new Set();
}

function saveStoredSet(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    /* abaikan error localStorage */
  }
}

function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ');
}

interface QuizModalProps {
  onClose: () => void;
}

export function QuizModal({ onClose }: QuizModalProps): React.ReactElement {
  const { addCoins, state } = useCustomization();
  const [activeCategory, setActiveCategory] = useState<QuizCategory>('out_of_topic');
  const [difficultyFilter, setDifficultyFilter] = useState<QuizDifficulty | 'all'>('all');

  // Answered and Locked question sets
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(() => loadStoredSet(STORAGE_KEY_ANSWERED));
  const [lockedIds, setLockedIds] = useState<Set<string>>(() => loadStoredSet(STORAGE_KEY_LOCKED));

  // Selected question in active category
  const [activeQuestionId, setActiveQuestionId] = useState<string>('oot-1');
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [essayAnswer, setEssayAnswer] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [rewardClaimed, setRewardClaimed] = useState<number | null>(null);

  // Secret unlock modal state
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [unlockInput, setUnlockInput] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

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

  const isCurrentLocked = lockedIds.has(currentQuestion.id);

  // Switch question reset state
  const handleSelectQuestion = (qId: string) => {
    setActiveQuestionId(qId);
    setSelectedOptions([]);
    setEssayAnswer('');
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
    if (isCurrentLocked) return;
    if (submitted && isCorrect) return;
    if (currentQuestion.multiSelect) {
      setSelectedOptions((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
      );
    } else {
      setSelectedOptions([index]);
    }
    if (submitted && !isCorrect) {
      setSubmitted(false);
    }
  };

  const handleSubmit = () => {
    if (isCurrentLocked) return;

    let win = false;

    if (currentQuestion.type === 'essay') {
      const cleanInput = normalizeAnswer(essayAnswer);
      if (!cleanInput) return;
      win = (currentQuestion.correctTextAnswers ?? []).some((ans) => {
        return normalizeAnswer(ans) === cleanInput;
      });
    } else {
      if (selectedOptions.length === 0) return;
      const correct = currentQuestion.correctIndices ?? [];
      const hasSameLength = selectedOptions.length === correct.length;
      const hasAllCorrect = selectedOptions.every((idx) => correct.includes(idx));
      win = hasSameLength && hasAllCorrect;
    }

    setSubmitted(true);
    setIsCorrect(win);

    if (win) {
      audio.cue('win');
      if (!answeredIds.has(currentQuestion.id)) {
        addCoins(currentQuestion.reward);
        setRewardClaimed(currentQuestion.reward);
        const updated = new Set(answeredIds).add(currentQuestion.id);
        setAnsweredIds(updated);
        saveStoredSet(STORAGE_KEY_ANSWERED, updated);
      } else {
        setRewardClaimed(0);
      }
      // Hapus dari daftar terkunci jika ada
      if (lockedIds.has(currentQuestion.id)) {
        const nextLocked = new Set(lockedIds);
        nextLocked.delete(currentQuestion.id);
        setLockedIds(nextLocked);
        saveStoredSet(STORAGE_KEY_LOCKED, nextLocked);
      }
    } else {
      audio.cue('dice');
      // Kunci soal otomatis karena salah jawab
      const nextLocked = new Set(lockedIds).add(currentQuestion.id);
      setLockedIds(nextLocked);
      saveStoredSet(STORAGE_KEY_LOCKED, nextLocked);
    }
  };

  const handleNextQuestion = () => {
    const currentIndex = questionList.findIndex((q) => q.id === currentQuestion.id);
    if (currentIndex >= 0 && currentIndex < questionList.length - 1) {
      handleSelectQuestion(questionList[currentIndex + 1]!.id);
    }
  };

  // Verifikasi pembukaan kunci soal dengan pertanyaan rahasia Oliv & Wijaya
  const handleUnlockSubmit = () => {
    const clean = normalizeAnswer(unlockInput);
    const valid = SECRET_UNLOCK_INFO.acceptedAnswers.some((ans) => normalizeAnswer(ans) === clean);

    if (valid) {
      audio.cue('land');
      const nextLocked = new Set(lockedIds);
      nextLocked.delete(currentQuestion.id);
      setLockedIds(nextLocked);
      saveStoredSet(STORAGE_KEY_LOCKED, nextLocked);

      // Reset state form
      setSubmitted(false);
      setIsCorrect(false);
      setSelectedOptions([]);
      setEssayAnswer('');
      setShowUnlockModal(false);
      setUnlockInput('');
      setUnlockError(null);
    } else {
      setUnlockError('Jawaban rahasia salah! Perhatikan clue dengan baik ya.');
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
            const isLocked = lockedIds.has(q.id);
            const isCurrent = q.id === currentQuestion.id;
            return (
              <button
                key={q.id}
                type="button"
                className={`quiz-chip${isCurrent ? ' quiz-chip--current' : ''}${isAnswered ? ' quiz-chip--completed' : ''}${isLocked ? ' quiz-chip--locked' : ''}`}
                onClick={() => handleSelectQuestion(q.id)}
                title={`Soal ${idx + 1}: ${q.reward} Koin${isLocked ? ' (Terkunci)' : ''}`}
              >
                <span>{idx + 1}</span>
                {isAnswered && <span className="quiz-chip__check">✓</span>}
                {isLocked && !isAnswered && <span className="quiz-chip__lock">🔒</span>}
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
              ℹ️ <em>Soal ini memiliki lebih dari 1 jawaban benar. Centang semua jawaban yang benar lalu tekan Periksa.</em>
            </p>
          )}

          {currentQuestion.type === 'essay' && (
            <p className="quiz-card__hint">
              ✍️ <em>Soal Esai: Ketik kepanjangan kata gaul ini secara lengkap pada kolom input di bawah.</em>
            </p>
          )}

          {/* Banner Jika Soal Terkunci Karena Salah Jawab */}
          {isCurrentLocked && (
            <div className="quiz-locked-banner" role="alert">
              <div className="quiz-locked-banner__content">
                <span className="quiz-locked-banner__icon">🔒</span>
                <div>
                  <h4 className="quiz-locked-banner__title">Soal Ini Terkunci!</h4>
                  <p className="quiz-locked-banner__desc">
                    Kamu salah menjawab soal ini sebelumnya. Soal tidak dapat langsung diulang kecuali kamu membuka kuncinya!
                  </p>
                  <button
                    type="button"
                    className="quiz-locked-banner__btn"
                    onClick={() => {
                      setUnlockError(null);
                      setUnlockInput('');
                      setShowUnlockModal(true);
                    }}
                  >
                    🔑 Buka Kunci Soal (Tebak Rahasia Oliv & Wijaya)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input Soal Esai */}
          {currentQuestion.type === 'essay' ? (
            <div className="quiz-essay-container">
              <label htmlFor="quiz-essay-field" className="quiz-essay-label">
                Tuliskan Jawabanmu:
              </label>
              <input
                id="quiz-essay-field"
                type="text"
                className="quiz-essay-input"
                placeholder="Contoh: ga ada contoh kerjain sendiri anjg"
                value={essayAnswer}
                onChange={(e) => setEssayAnswer(e.target.value)}
                disabled={isCurrentLocked || (submitted && isCorrect)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCurrentLocked && (!submitted || !isCorrect)) {
                    handleSubmit();
                  }
                }}
              />
            </div>
          ) : (
            /* Pilihan Jawaban Multiple Choice */
            <div className="quiz-options">
              {(currentQuestion.options ?? []).map((opt, idx) => {
                const isSelected = selectedOptions.includes(idx);
                const isCorrectOption = (currentQuestion.correctIndices ?? []).includes(idx);
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
                    disabled={isCurrentLocked || (submitted && isCorrect)}
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
          )}

          {/* Feedback Hasil Jawaban */}
          {submitted && (
            <div className={`quiz-feedback quiz-feedback--${isCorrect ? 'correct' : 'wrong'}`}>
              <div className="quiz-feedback__content">
                <span className="quiz-feedback__icon">{isCorrect ? '🎉' : '❌'}</span>
                <div>
                  <h4 className="quiz-feedback__title">
                    {isCorrect ? 'Luar Biasa, Jawaban Kamu Benar!' : 'Jawaban Kurang Tepat & Soal Terkunci!'}
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
                    <p className="quiz-feedback__desc">
                      Soal ini telah terkunci. Klik tombol <strong>Buka Kunci</strong> di atas untuk menjawab tebakan rahasia Oliv & Wijaya agar bisa mengulang kembali!
                    </p>
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
                disabled={isCurrentLocked || (currentQuestion.type === 'essay' ? !essayAnswer.trim() : selectedOptions.length === 0)}
              >
                {isCurrentLocked ? '🔒 Soal Terkunci' : 'Periksa Jawaban'}
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

      {/* ── Modal Buka Kunci: Pertanyaan Rahasia Oliv & Wijaya ── */}
      {showUnlockModal && (
        <div className="quiz-unlock-backdrop" role="dialog" aria-modal="true" aria-label="Buka Kunci Soal">
          <div className="quiz-unlock-dialog">
            <div className="quiz-unlock-dialog__header">
              <span className="quiz-unlock-dialog__icon">🤫</span>
              <h3 className="quiz-unlock-dialog__title">Tebakan Rahasia</h3>
              <p className="quiz-unlock-dialog__sub">Hanya Oliv dan Wijaya yang tahu!</p>
            </div>

            <div className="quiz-unlock-dialog__body">
              <p className="quiz-unlock-dialog__question">
                {SECRET_UNLOCK_INFO.question}
              </p>

              <div className="quiz-unlock-dialog__clue-box">
                <span className="quiz-unlock-dialog__clue-icon">💡</span>
                <p className="quiz-unlock-dialog__clue-text">
                  {SECRET_UNLOCK_INFO.clue}
                </p>
              </div>

              <div className="quiz-unlock-dialog__field">
                <label htmlFor="quiz-unlock-input" className="quiz-unlock-dialog__label">
                  Jawaban Kamu:
                </label>
                <input
                  id="quiz-unlock-input"
                  type="text"
                  className="quiz-essay-input"
                  placeholder="Ketik makanan pinggir jalan di sini..."
                  value={unlockInput}
                  onChange={(e) => {
                    setUnlockInput(e.target.value);
                    if (unlockError) setUnlockError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUnlockSubmit();
                  }}
                  autoFocus
                />
              </div>

              {unlockError && (
                <p className="quiz-unlock-dialog__error" role="alert">
                  ❌ {unlockError}
                </p>
              )}
            </div>

            <div className="quiz-unlock-dialog__actions">
              <button
                type="button"
                className="hud__button quiz-submit-btn"
                onClick={handleUnlockSubmit}
                disabled={!unlockInput.trim()}
              >
                Buka Kunci Soal 🔓
              </button>
              <button
                type="button"
                className="hud__button hud__button--quiet"
                onClick={() => {
                  setShowUnlockModal(false);
                  setUnlockError(null);
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
