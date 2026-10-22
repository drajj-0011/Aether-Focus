import { describe, expect, it } from 'vitest';
import { createBlueprint, formatTime, getLastSevenDays, getStreak, sessionsToCsv } from './planner';
import type { Session } from '../types';

const session = (completedAt: string, minutes = 25): Session => ({
  id: completedAt,
  intention: 'Write the first draft',
  minutes,
  completedAt,
  energy: 3,
  soundscape: 'rain',
});

describe('adaptive session planner', () => {
  it('allocates the complete session across all phases', () => {
    [10, 25, 50, 90].forEach((minutes) => {
      const plan = createBlueprint(minutes, 3);
      expect(plan.reduce((sum, step) => sum + step.minutes, 0)).toBe(minutes);
    });
  });

  it('gives low-energy sessions a softer start', () => {
    expect(createBlueprint(50, 1)[0].minutes).toBeGreaterThan(createBlueprint(50, 5)[0].minutes);
  });
});

describe('time and insights', () => {
  it('formats timer values', () => {
    expect(formatTime(1500)).toBe('25:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(-1)).toBe('00:00');
  });

  it('calculates a current streak', () => {
    const now = new Date('2026-10-23T12:00:00');
    expect(getStreak([
      session('2026-10-23T09:00:00'),
      session('2026-10-22T09:00:00'),
      session('2026-10-21T09:00:00'),
    ], now)).toBe(3);
  });

  it('returns seven days in chronological order', () => {
    const days = getLastSevenDays([], new Date('2026-10-23T12:00:00'));
    expect(days).toHaveLength(7);
    expect(days[6].key).toBe('2026-10-23');
  });

  it('exports valid escaped CSV', () => {
    const csv = sessionsToCsv([{ ...session('2026-10-23T09:00:00'), intention: 'A "small" step' }]);
    expect(csv).toContain('"A ""small"" step"');
  });
});
