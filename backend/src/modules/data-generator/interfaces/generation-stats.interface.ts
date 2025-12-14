export interface UserCredentials {
  email: string;
  password: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export interface GenerationStats {
  totalEntities: number;
  entitiesByType: Record<string, number>;
  duration: number; // secondes
  errors: Array<{
    step: string;
    error: string;
    timestamp: Date;
  }>;
  warnings: Array<{
    step: string;
    warning: string;
    timestamp: Date;
  }>;
  steps: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    duration?: number;
    entitiesGenerated?: number;
    error?: string;
  }>;
  createdUsers?: UserCredentials[]; // Informations des utilisateurs créés
}

export interface GenerationProgress {
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  progress: number; // 0-100
  currentStepProgress: number; // 0-100
  estimatedTimeRemaining?: number; // secondes
}

