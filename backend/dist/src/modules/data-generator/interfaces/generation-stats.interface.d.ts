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
    duration: number;
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
    createdUsers?: UserCredentials[];
}
export interface GenerationProgress {
    currentStep: string;
    totalSteps: number;
    completedSteps: number;
    progress: number;
    currentStepProgress: number;
    estimatedTimeRemaining?: number;
}
