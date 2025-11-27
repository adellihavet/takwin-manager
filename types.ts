
export interface Specialty {
  id: string;
  name: string;
  count: number;
  groups: number;
  color: string;
}

export interface SessionInfo {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  hoursTotal: number;
  description: string;
}

export interface Module {
  id: number;
  title: string;
  shortTitle: string; // Added for printing
  totalHours: number;
  description?: string;
}

export interface Distribution {
  moduleId: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface TopicItem {
    topic: string;
    duration: number; // Hours allocated to this specific topic
}

export interface ModuleContent {
    moduleId: number;
    s1Topics: TopicItem[];
    s2Topics: TopicItem[];
    s3Topics: TopicItem[];
}

export interface TimeSlot {
  time: string;
  moduleId: number | null; // null represents free time or break
  duration: 1 | 2;
}

export interface DaySchedule {
  date: string; // ISO string
  slots: TimeSlot[];
}

export interface GroupSchedule {
  groupId: number;
  specialtyId?: string; // Added for context
  days: DaySchedule[];
}

// Updated Trainer Types
export interface TrainerConfig {
  [moduleId: number]: {
    // For Module 1 (Didactics), we need count per specialty
    specialtyCounts?: Record<string, number>; 
    // For General Modules, we just need a global count
    generalCount?: number; 
    // Map of IDs to Names. 
    // Keys for General: "1", "2", "3"
    // Keys for Specialty: "pe-1", "pe-2", "eng-1"
    names: Record<string, string>; 
  }
}

export interface TrainerAssignment {
  moduleId: number;
  trainerKey: string;
  groupId: string;
  dayIndex: number;
  hourIndex: number;
}

export interface InstitutionConfig {
  wilaya: string;
  institute: string;
  center: string;
  director: string;
}

export interface ReportSection {
  title: string;
  content: string;
}

export interface SummaryData {
  introduction: string;
  pedagogicalActivities: string;
  administrativeConditions: string;
  difficulties: string;
  recommendations: string;
  conclusion: string;
}

export interface ReportConfig {
  s1: SummaryData;
  s2: SummaryData;
  s3: SummaryData;
  final: SummaryData;
}

// New Interface for Trainees
export interface Trainee {
  id: string; // uuid or random string
  surname: string;
  name: string;
  dob: string;
  pob: string;
  gender: 'M' | 'F';
  school: string;
  municipality: string;
  specialtyId: string; // links to Specialty.id
  groupId?: number;
}

// Key: "YYYY-MM-DD-TraineeID", Value: 'P' (Present) | 'A' (Absent)
export type AttendanceRecord = Record<string, 'P' | 'A'>;

// New Interface for Grades
export interface GradeRecord {
  s1?: number;
  s2?: number;
  s3?: number;
  finalExam?: number;
  report?: number;
}

// Map TraineeID -> GradeRecord
export type EvaluationDatabase = Record<string, GradeRecord>;

// --- EXAM MANAGEMENT TYPES ---
export interface ExamSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  moduleId: number;
}

export interface ExamRoom {
  id: number; // Room Number
  specialtyId: string;
  trainees: Trainee[];
  capacity: number; // Fixed to 20 usually
}

export interface ProctorAssignment {
  roomId: number;
  examSlotId: string;
  proctor1: string; // Name
  proctor2: string; // Name
}

export interface ProjectDatabase {
  institutionConfig?: InstitutionConfig;
  specialties: Specialty[];
  trainerConfig: TrainerConfig;
  schedule?: GroupSchedule[]; 
  assignments?: TrainerAssignment[]; 
  reports?: ReportConfig; 
  trainees?: Trainee[]; 
  attendance?: AttendanceRecord; 
  evaluations?: EvaluationDatabase;
  examSchedule?: ExamSlot[]; 
  examProctors?: ProctorAssignment[]; 
  externalProctors?: string[]; // Added for extra exam staff
  version: string;
  savedAt: string;
}
