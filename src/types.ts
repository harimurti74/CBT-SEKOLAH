export type SchoolLevel = 'SD/MI' | 'SMP/MTs' | 'SMA/MA/SMK/MAK' | 'SLB';

export interface AppConfig {
  appTitle: string;
  schoolName: string;
  schoolLevel?: SchoolLevel;
  token: string;
  gdriveUrl: string;
  mapels: string[];
  kelas: string[];
  durationMinutes: number;
  maxViolations: number;
  shuffleQuestions: boolean;
  verificationMode?: 'crosscheck' | 'manual';
}

export interface ClientQuestion {
  id: number;
  subject: string;
  type: 'mcq' | 'tf' | 'short' | 'checkbox' | 'slide_image';
  typeTitle: string;
  questionCode: string;
  assignedVariantCode?: string; // 'A' | 'B' | 'C' | 'D'
  slideFileName?: string; // e.g. 'INGGRIS_1A'
  imageUrl?: string; // Base64 data URL or uploaded image URL
  questionText: string;
  options: string[];
  maxPoints: number;
  passage?: string;
  // NOTE: 'key' is NEVER sent to client (Zero Knowledge)
}

export interface MasterStudent {
  no: number;
  name: string;
  noPeserta: string;
  className: string;
  subject: string;
}

export interface StudentSubmission {
  id: string;
  schoolName: string;
  studentName: string;
  noPeserta: string;
  className: string;
  subject: string;
  assignedPackage?: string;
  answers: Record<number, string | string[]>;
  violationsCount: number;
  startTime: string;
  submitTime: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: 'Selesai' | 'Curang (Disubmit)' | 'Direset' | 'Sedang Mengerjakan';
  syncedToGdrive: boolean;
  gdriveSyncTime?: string;
}

export interface ScoreBreakdownItem {
  questionId: number;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  scoreEarned: number;
  maxPoints: number;
  isCorrect: boolean;
  variantCode?: string;
}

export interface AuditVulnerability {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  legacyStatus: string;
  legacyExplanation: string;
  secureStatus: string;
  secureExplanation: string;
}
