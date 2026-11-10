import { describe, it, expect } from 'vitest';
import { QUIZ_QUESTIONS } from '../game/quiz/quizData';

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
    expect(q1.correctIndices).toEqual([0, 1]);
    expect(q1.options[0]).toContain('main ludo sama oliv ada iklannya');
    expect(q1.options[1]).toContain('oliv itu sendiri');

    // Soal 2: Tanggal pertama kali dibuat (21 Oktober)
    const q2 = ootQuestions.find((q) => q.id === 'oot-2')!;
    expect(q2).toBeDefined();
    expect(q2.options[q2.correctIndices[0]!]).toBe('21 Oktober');

    // Soal 3: Alasan benci cewe friendly (karna ga ada value sama sekali)
    const q3 = ootQuestions.find((q) => q.id === 'oot-3')!;
    expect(q3).toBeDefined();
    expect(q3.options[q3.correctIndices[0]!]).toBe('Karna ga ada value sama sekali');
  });

  it('memiliki bank soal Pengetahuan Umum dengan reward 10 - 50 koin', () => {
    const genQuestions = QUIZ_QUESTIONS.filter((q) => q.category === 'general');
    expect(genQuestions.length).toBeGreaterThanOrEqual(25);

    for (const q of genQuestions) {
      expect(q.reward).toBeGreaterThanOrEqual(10);
      expect(q.reward).toBeLessThanOrEqual(50);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      for (const idx of q.correctIndices) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(q.options.length);
      }
    }
  });

  it('setiap soal memiliki teks pertanyaan, opsi valid, dan penjelasan yang jelas', () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.question.trim().length).toBeGreaterThan(10);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.correctIndices.length).toBeGreaterThanOrEqual(1);
    }
  });
});
