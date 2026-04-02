
export type Instrument = 'Violão' | 'Piano';
export type Level = 'NZ' | 'N1' | 'N2' | 'N3';
export type UserRole = 'ADMIN' | 'STUDENT';

export interface CycleLesson {
  id: string;
  title: string;
  completed: boolean;
  date?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  instrument?: Instrument;
  level?: Level;
  avatar?: string;
  birthDate?: string;
  city?: string;
  state?: string;
  country?: string;
  whatsapp?: string;
  // Controle de Ciclo de Aulas
  totalCompletedClasses?: number;
  currentCycle?: CycleLesson[]; // Mantido para compatibilidade, mas usaremos a lógica de schedules
}

export interface Lesson {
  id: string;
  title: string;
  videoArranjoUrl: string;
  videoAoVivoUrl: string;
  description: string;
}

export interface LessonDB extends Lesson {
  courseId?: string;
  instrument: Instrument;
  level: Level;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  instrument: Instrument;
  level: Level;
  description: string;
  modules: Module[];
  studentIds: string[];
}

export interface ScheduledClass {
  id: string;
  studentId: string;
  studentName?: string; // Nome do aluno para facilitar visualização no banco
  teacherId: string;
  date: string;
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'ABSENT';
  instrument: Instrument;
  title?: string; // Campo opcional para nomear a aula na agenda
}

export interface PracticeSession {
  id: string;
  studentId: string;
  duration: number; // in seconds
  date: string;
  notes?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  dueDate: string;
}

export interface Quote {
  id: string;
  text: string;
  reference: string;
  created_at?: string;
}
