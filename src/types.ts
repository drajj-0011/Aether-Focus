export type View = 'studio' | 'insights' | 'about';
export type Soundscape = 'still' | 'rain' | 'night';
export type Energy = 1 | 2 | 3 | 4 | 5;

export interface Session {
  id: string;
  intention: string;
  minutes: number;
  completedAt: string;
  energy: Energy;
  soundscape: Soundscape;
}

export interface BlueprintStep {
  label: string;
  minutes: number;
  detail: string;
  tone: 'warm' | 'lime' | 'violet';
}
