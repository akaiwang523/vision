
export interface RecognitionResult {
  summary: string;
  objects: {
    name: string;
    description: string;
    confidence: string;
  }[];
  colors: string[];
  labels: string[];
  textDetected: string | null;
  aiLearningFeedback?: string; // AI 說明它從校正中學到了什麼
}

export interface LearnedKnowledge {
  original: string;
  corrected: string;
  timestamp: number;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  REFINING = 'REFINING' 
}
