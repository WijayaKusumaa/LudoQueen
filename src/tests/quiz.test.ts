import { describe, it, expect } from 'vitest';
import { QUIZ_QUESTIONS, SECRET_UNLOCK_INFO } from '../game/quiz/quizData';

describe('Sistem Kuis Berhadiah Koin (Quiz System)', () => {
  it('memiliki soal Out of Topic dari Developer dengan reward 1000 koin', () => {
    const ootQuestions = QUIZ_QUESTIONS.filter((q) => q.category === 'out_of_topic');
    expect(ootQuestions.length).toBe(3);

    for (const q of ootQuestions) {
      expect(q.reward).toBe(1000);
    }

    // Soal 1: Alasan Wijaya membuat aplikasi (pilih 2 yang benar)
    const q1 = ootQuestions.find((q) => q.id === 'oot-1')!;
    expect(q1).toBeDefined();
    expect(q1.multiSelect).toBe(true);
    expect(q1.correctIndices).toEqual([0, 3]);
    expect(q1.options?.[0]).toContain('mabar Ludo bareng O iklannya banyak bener');
    expect(q1.options?.[3]).toContain('Karna aku pinter aja sih');

    // Soal 2: Tanggal pertama kali dibuat (21 Oktober)
    const q2 = ootQuestions.find((q) => q.id === 'oot-2')!;
    expect(q2).toBeDefined();
    expect(q2.options?.[q2.correctIndices![0]!]).toBe('21 Oktober');

    // Soal 3: Esai singkatan SASIMO (Sana Sini Mau)
    const q3 = ootQuestions.find((q) => q.id === 'oot-3')!;
    expect(q3).toBeDefined();
    expect(q3.type).toBe('essay');
    expect(q3.question).toContain('SASIMO');
    expect(q3.correctTextAnswers).toContain('sana sini mau');
  });

  it('memiliki data tebakan rahasia pembuka kunci soal (tahu tek)', () => {
    expect(SECRET_UNLOCK_INFO.question).toContain('Oliv dan Wijaya');
    expect(SECRET_UNLOCK_INFO.clue).toContain('tahu tek');
    expect(SECRET_UNLOCK_INFO.acceptedAnswers).toContain('tahu tek');
    expect(SECRET_UNLOCK_INFO.acceptedAnswers).toContain('tahutek');
  });

  it('memiliki bank soal Pengetahuan Umum dengan reward 10 - 50 koin', () => {
    const genQuestions = QUIZ_QUESTIONS.filter((q) => q.category === 'general');
    expect(genQuestions.length).toBeGreaterThanOrEqual(25);

    for (const q of genQuestions) {
      expect(q.reward).toBeGreaterThanOrEqual(10);
      expect(q.reward).toBeLessThanOrEqual(50);
      expect(q.options?.length).toBeGreaterThanOrEqual(3);
      for (const idx of q.correctIndices ?? []) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(q.options?.length ?? 0);
      }
    }
  });

  it('setiap soal memiliki teks pertanyaan dan data jawaban valid', () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.question.trim().length).toBeGreaterThan(10);
      if (q.type === 'essay') {
        expect(q.correctTextAnswers?.length).toBeGreaterThanOrEqual(1);
      } else {
        expect(q.options?.length).toBeGreaterThanOrEqual(3);
        expect(q.correctIndices?.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});


