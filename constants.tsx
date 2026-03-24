
import { Course, Material, ScheduledClass, User, Payment, Module, Lesson, CycleLesson } from './types';

export const COLORS = {
  primary: '#cc0000',
  white: '#ffffff',
  black: '#111111',
};

export const DEFAULT_AVATARS = {
  male: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
  female: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffdfbf'
};

const getDefaultCycle = (): CycleLesson[] => [
  { id: 'l1', title: 'Aula 1 - Postura e Acordes Básicos', completed: false },
  { id: 'l2', title: 'Aula 2 - Ritmos Iniciais', completed: false },
  { id: 'l3', title: 'Aula 3 - Transição de Acordes', completed: false },
  { id: 'l4', title: 'Aula 4 - Primeiro Hino Completo', completed: false },
];

const createMockModules = (instrument: string): Module[] => {
  const modules: Module[] = [];
  for (let m = 1; m <= 4; m++) {
    const lessons: Lesson[] = [];
    for (let h = 1; h <= 3; h++) {
      lessons.push({
        id: `m${m}-h${h}-${instrument}`,
        title: `Hino ${m * 10 + h} - Exemplo ${instrument}`,
        videoArranjoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        videoAoVivoUrl: 'https://www.youtube.com/embed/9bZkp7q19f0',
        description: `Estudo detalhado do hino para ${instrument}.`
      });
    }
    modules.push({
      id: `mod-${m}-${instrument}`,
      title: `Módulo ${m}`,
      lessons
    });
  }
  return modules;
};

export const MOCK_ADMIN: User = {
  id: 'admin-1',
  name: 'Professor Admin',
  email: 'comotocarhinos@gmail.com',
  role: 'ADMIN',
  avatar: 'https://picsum.photos/seed/admin/200'
};

export const MOCK_STUDENTS: User[] = [
  { 
    id: 'std-1', 
    name: 'João Silva', 
    email: 'joao@email.com', 
    role: 'STUDENT', 
    instrument: 'Violão', 
    level: 'NZ', 
    avatar: DEFAULT_AVATARS.male,
    whatsapp: '(11) 98888-7777',
    currentCycle: getDefaultCycle()
  },
  { 
    id: 'std-2', 
    name: 'Maria Santos', 
    email: 'maria@email.com', 
    role: 'STUDENT', 
    instrument: 'Piano', 
    level: 'N1', 
    avatar: DEFAULT_AVATARS.female,
    whatsapp: '(11) 96666-5555',
    currentCycle: getDefaultCycle()
  },
];

export const MOCK_COURSES: Course[] = [
  { 
    id: 'c1', 
    title: 'Violão Iniciante (NZ)', 
    instrument: 'Violão', 
    level: 'NZ', 
    description: 'Os primeiros passos no violão para tocar hinos.', 
    modules: createMockModules('Violão'),
    studentIds: ['std-1'] 
  },
  { 
    id: 'c2', 
    title: 'Piano Intermediário (N1)', 
    instrument: 'Piano', 
    level: 'N1', 
    description: 'Harmonização básica para hinos congregacionais.', 
    modules: createMockModules('Piano'),
    studentIds: ['std-2'] 
  },
];

export const MOCK_SCHEDULES: ScheduledClass[] = [
  { id: 'sc1', studentId: 'std-1', teacherId: 'admin-1', date: '2023-11-25', time: '14:00', status: 'CONFIRMED', instrument: 'Violão' },
];

export const MOCK_PAYMENTS: Payment[] = [
  { id: 'p1', studentId: 'std-1', amount: 150.00, status: 'PAID', dueDate: '2023-11-05' },
];

export const MOCK_MATERIALS: Material[] = [
  { id: 'm1', title: 'Apostila Hinos CCB - Violão', fileUrl: '#', instrument: 'Violão', level: 'NZ' },
  { id: 'm2', title: 'Partituras Hinos 1 ao 50', fileUrl: '#', instrument: 'Piano', level: 'N1' },
];
