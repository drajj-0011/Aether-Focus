import type { BlueprintStep, Energy, Session } from '../types';

export function createBlueprint(minutes: number, energy: Energy): BlueprintStep[] {
  const safeMinutes = Math.max(5, minutes);
  const arrive = energy <= 2
    ? Math.min(4, Math.max(2, Math.round(safeMinutes * 0.12)))
    : safeMinutes >= 40 ? 3 : 2;
  const reflect = safeMinutes >= 35 ? 3 : 2;
  const focus = Math.max(1, safeMinutes - arrive - reflect);

  return [
    {
      label: energy <= 2 ? 'Soft start' : 'Arrive',
      minutes: arrive,
      detail: energy <= 2 ? 'Choose the smallest possible first move.' : 'Clear the noise. Name your one thing.',
      tone: 'violet',
    },
    {
      label: energy >= 4 ? 'Flow state' : 'Single-thread',
      minutes: focus,
      detail: energy >= 4 ? 'Follow the momentum. Stay with the hard part.' : 'One intention. Everything else can wait.',
      tone: 'lime',
    },
    {
      label: 'Close the loop',
      minutes: reflect,
      detail: 'Capture what moved and what comes next.',
      tone: 'warm',
    },
  ];
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.max(0, totalSeconds) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getStreak(sessions: Session[], now = new Date()): number {
  const days = new Set(sessions.map((session) => toDayKey(new Date(session.completedAt))));
  let streak = 0;
  const cursor = new Date(now);
  if (!days.has(toDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLastSevenDays(sessions: Session[], now = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const key = toDayKey(date);
    return {
      key,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
      minutes: sessions
        .filter((session) => toDayKey(new Date(session.completedAt)) === key)
        .reduce((total, session) => total + session.minutes, 0),
    };
  });
}

export function sessionsToCsv(sessions: Session[]): string {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = sessions.map((session) => [
    session.completedAt,
    escape(session.intention),
    session.minutes,
    session.energy,
    session.soundscape,
  ].join(','));
  return ['completed_at,intention,minutes,energy,soundscape', ...rows].join('\n');
}
