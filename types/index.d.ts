export type JokeMode = 'standup' | 'one-liner' | 'roast' | 'encouragement';

export interface ClaumedyJokeState {
  currentJoke: string;
  jokeIndex: number;
  mode: JokeMode;
  promptText: string;
  turnId: string | null;
  isSpinning: boolean;
}

declare module 'claude-code' {
  interface PluginState {
    'claumedy': {
      state: ClaumedyJokeState
    }
  }
}
