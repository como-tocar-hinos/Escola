
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Course, ScheduledClass, Payment, Material, Instrument, Level, Module, Lesson } from '../types';
import { DEFAULT_AVATARS } from '../constants';
import { generateLessonDescription } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  CreditCard, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  CheckCircle2, 
  ArrowLeft,
  Layout,
  Upload,
  Activity,
  Search,
  MessageCircle,
  FileText
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  students: User[];
  courses: Course[];
  schedules: ScheduledClass[];
  payments: Payment[];
  materials: Material[];
  onAddStudent: (s: User, password?: string) => Promise<void>;
  onUpdateStudent: (s: User) => Promise<void>;
  onAddSchedule: (sc: ScheduledClass) => Promise<void>;
  onUpdateSchedule: (id: string, status: ScheduledClass['status']) => Promise<void>;
  onAddCourse: (c: Course) => Promise<void>;
  onUpdateCourseContent: (c: Course) => Promise<void>;
  onUpdateCourseAccess: (id: string, ids: string[]) => Promise<void>;
  onAddPayment: (p: Payment) => Promise<void>;
  onUpdatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onResetPassword: (id: string, newPassword: string) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onDeleteCourse: (id: string) => Promise<void>;
  onDeletePayment: (id: string) => Promise<void>;
  onAddMaterial: (m: Material) => Promise<void>;
  onUpdateMaterial: (id: string, updates: Partial<Material>) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
}

type AdminView = 'dashboard' | 'students' | 'courses' | 'schedules' | 'payments' | 'materials';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user, onLogout, students, courses, schedules, payments, materials, 
  onAddStudent, onUpdateStudent, onAddSchedule, onUpdateSchedule, onAddCourse, onUpdateCourseContent, onUpdateCourseAccess, onAddPayment, onUpdatePayment,
  onDeleteStudent, onResetPassword, onDeleteSchedule, onDeleteCourse, onDeletePayment,
  onAddMaterial, onUpdateMaterial, onDeleteMaterial
}) => {
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [managingAccessCourse, setManagingAccessCourse] = useState<Course | null>(null);
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [editingCourseContent, setEditingCourseContent] = useState<Course | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('Olá! Passando para lembrar da importância de dedicar pelo menos 15 minutos hoje ao seu instrumento. A prática constante é o segredo do louvor perfeito! 🎹🎸');
  const [sentStudents, setSentStudents] = useState<string[]>([]);
  const [scheduleSearchTerm, setScheduleSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSendingBroadcast) {
      setSentStudents([]);
    }
  }, [isSendingBroadcast]);

  const { annualTotal, monthlyTotal } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
                    const annual = payments.filter(p => p.status === 'PAID' && new Date(p.dueDate.replace(/-/g, '\/')).getFullYear() === currentYear).reduce((acc, curr) => acc + Number(curr.amount), 0);
                    const monthly = payments.filter(p => { const d = new Date(p.dueDate.replace(/-/g, '\/')); return p.status === 'PAID' && d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((acc, curr) => acc + Number(curr.amount), 0);
    return { annualTotal: annual, monthlyTotal: monthly };
  }, [payments]);

  const getStudentCycleInfo = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;
    const completed = student.totalCompletedClasses || 0;
    const cycles = Math.floor(completed / 4);
    const currentCycleClass = (completed % 4) + 1;
    return { completed, cycles, currentCycleClass };
  };

  const handleToggleAccess = async (courseId: string, studentId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    
    let newIds = [...(course.studentIds || [])];
    if (newIds.includes(studentId)) {
      newIds = newIds.filter(id => id !== studentId);
    } else {
      newIds.push(studentId);
    }

    setIsSyncing(true);
    await onUpdateCourseAccess(courseId, newIds);
    
    // Atualiza o estado local do modal para refletir a mudança imediatamente
    if (managingAccessCourse && managingAccessCourse.id === courseId) {
      setManagingAccessCourse({ ...managingAccessCourse, studentIds: newIds });
    }
    
    setIsSyncing(false);
  };

  const addModule = () => {
    if (!editingCourseContent) return;
    const newModule: Module = { id: `mod-${Date.now()}`, title: `Novo Módulo`, lessons: [] };
    setEditingCourseContent({ ...editingCourseContent, modules: [...(editingCourseContent.modules || []), newModule] });
  };

  const addLesson = (moduleId: string) => {
    if (!editingCourseContent) return;
    const newLesson: Lesson = { id: `lesson-${Date.now()}`, title: 'Nova Aula', videoArranjoUrl: '', videoAoVivoUrl: '', description: '' };
    const updatedModules = editingCourseContent.modules.map(m => m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m);
    setEditingCourseContent({ ...editingCourseContent, modules: updatedModules });
  };

  const updateLesson = (modId: string, lesId: string, updates: Partial<Lesson>) => {
    if (!editingCourseContent) return;
    const updated = editingCourseContent.modules.map(m => m.id === modId ? { ...m, lessons: m.lessons.map(l => l.id === lesId ? { ...l, ...updates } : l) } : m);
    setEditingCourseContent({ ...editingCourseContent, modules: updated });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-slate-950">
      <div className="p-8 flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-red-600 tracking-tighter uppercase">Painel</h2>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrativo</span>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-950 hover:text-red-600 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <SidebarLink 
          active={activeView === 'dashboard'} 
          onClick={() => { setActiveView('dashboard'); setIsSidebarOpen(false); }} 
          icon={<Layout className="w-5 h-5" />} label="Dashboard" 
        />
        <SidebarLink 
          active={activeView === 'students'} 
          onClick={() => { setActiveView('students'); setIsSidebarOpen(false); }} 
          icon={<Users className="w-5 h-5" />} label="Alunos" 
        />
        <SidebarLink 
          active={activeView === 'courses'} 
          onClick={() => { setActiveView('courses'); setIsSidebarOpen(false); }} 
          icon={<BookOpen className="w-5 h-5" />} label="Cursos" 
        />
        <SidebarLink 
          active={activeView === 'schedules'} 
          onClick={() => { setActiveView('schedules'); setIsSidebarOpen(false); }} 
          icon={<Calendar className="w-5 h-5" />} label="Agenda" 
        />
        <SidebarLink 
          active={activeView === 'payments'} 
          onClick={() => { setActiveView('payments'); setIsSidebarOpen(false); }} 
          icon={<CreditCard className="w-5 h-5" />} label="Financeiro" 
        />
        <SidebarLink 
          active={activeView === 'materials'} 
          onClick={() => { setActiveView('materials'); setIsSidebarOpen(false); }} 
          icon={<FileText className="w-5 h-5" />} label="Materiais" 
        />
        <SidebarLink 
          active={isSendingBroadcast} 
          onClick={() => { setIsSendingBroadcast(true); setIsSidebarOpen(false); }} 
          icon={<MessageCircle className="w-5 h-5" />} label="Dica do Professor" 
        />
      </nav>
      <div className="p-8 border-t border-slate-100">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onLogout} 
          className="text-slate-400 hover:text-red-600 w-full justify-start"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair do Admin
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-white overflow-hidden relative">
      {isSyncing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center pointer-events-auto">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center space-y-4 animate-in zoom-in duration-300">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sincronizando...</p>
          </div>
        </div>
      )}
      {/* Sidebar Desktop */}
      <aside className="w-64 hidden lg:block shrink-0 border-r border-slate-100">
        <SidebarContent />
      </aside>

      {/* Sidebar Mobile (Floating Drawer) */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsSidebarOpen(false)}
      >
        <aside 
          className={`w-72 h-full bg-black transform transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <SidebarContent />
        </aside>
      </div>

      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Sticky Header Mobile & Desktop */}
        <header className="sticky top-0 z-[200] bg-white/90 backdrop-blur-md px-4 lg:px-8 py-3 lg:py-6 flex justify-between items-center border-b border-slate-100">
           <div className="flex items-center gap-3 lg:gap-4">
             <button 
               onClick={() => setIsSidebarOpen(true)} 
               className="lg:hidden bg-black text-white p-2.5 rounded-xl shadow-xl active:scale-95 transition-transform"
             >
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </button>
             <div className="flex flex-col">
               <h1 className="text-lg lg:text-3xl font-black uppercase tracking-tighter truncate leading-none">
                 {activeView === 'dashboard' && "Dashboard"}
                 {activeView === 'students' && "Alunos"}
                 {activeView === 'courses' && "Cursos"}
                 {activeView === 'schedules' && "Agenda"}
                 {activeView === 'payments' && "Financeiro"}
               </h1>
               <p className="hidden lg:block text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Escola Como Tocar Hinos</p>
             </div>
           </div>
           
           <div className="flex items-center gap-3">
             <div className={`shrink-0 px-3 py-1 rounded-full text-[7px] lg:text-[9px] font-black uppercase ${isSyncing ? 'bg-yellow-500 text-black' : 'bg-green-600 text-white shadow-lg shadow-green-600/20'}`}>
               {isSyncing ? "..." : "OK"}
             </div>
             <img src={user.avatar} className="w-7 h-7 lg:w-8 lg:h-8 rounded-full border-2 border-red-600" alt="Admin" />
           </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {activeView === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-8 border-l-4 border-red-600 border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Total de Alunos</p>
                  <h3 className="text-4xl font-black tracking-tighter text-slate-900">{students.filter(s => s.role === 'STUDENT').length}</h3>
                </Card>
                <Card className="p-8 border-l-4 border-slate-900 border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Cursos Ativos</p>
                  <h3 className="text-4xl font-black tracking-tighter text-slate-900">{courses.length}</h3>
                </Card>
                <Card className="p-8 border-l-4 border-red-600 border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Aulas este Mês</p>
                  <h3 className="text-4xl font-black tracking-tighter text-slate-900">
                      {schedules.filter(s => {
                        const d = new Date(s.date.replace(/-/g, '\/'));
                        const now = new Date();
                        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                      }).length}
                  </h3>
                </Card>
                <Card className="p-8 border-l-4 border-slate-900 border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Receita Mensal</p>
                  <h3 className="text-4xl font-black tracking-tighter text-slate-900">R$ {monthlyTotal.toLocaleString('pt-BR')}</h3>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-8 border-slate-100">
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Alunos por Instrumento</h3>
                  <div className="space-y-4">
                    {['Violão', 'Piano'].map(inst => {
                      const count = students.filter(s => s.instrument === inst).length;
                      const total = students.filter(s => s.role === 'STUDENT').length;
                      const percent = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div key={inst} className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase">
                            <span>{inst}</span>
                            <span>{count} Alunos</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${inst === 'Violão' ? 'bg-red-600' : 'bg-slate-950'}`} 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card className="p-8 border-slate-100">
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Próximos Compromissos</h3>
                  <div className="space-y-4">
                    {schedules
                      .filter(s => s.status === 'PENDING')
                      .sort((a, b) => new Date(`${a.date.replace(/-/g, '\/')}T${a.time || '00:00:00'}`).getTime() - new Date(`${b.date.replace(/-/g, '\/')}T${b.time || '00:00:00'}`).getTime())
                      .slice(0, 5)
                      .map(sc => (
                      <div key={sc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black shadow-sm">
                            {students.find(s => s.id === sc.studentId)?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-tight">{students.find(s => s.id === sc.studentId)?.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">{sc.time} • {new Date(sc.date.replace(/-/g, '\/')).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <Badge variant="warning" className="text-[8px]">Pendente</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeView === 'students' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Gestão de Alunos</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total: {students.filter(s => s.role === 'STUDENT').length}</p>
                </div>
                <Button onClick={() => setIsAddingStudent(true)} className="px-6">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Aluno
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
                {students.filter(s => s.role === 'STUDENT').map(s => {
                const info = getStudentCycleInfo(s.id);
                return (
                  <Card key={s.id} className="p-6 md:p-8 group">
                    <div className="flex flex-col items-center mb-6 md:mb-8">
                      <div className="relative mb-4 md:mb-6">
                        <motion.img 
                          whileHover={{ scale: 1.05 }}
                          src={s.avatar || DEFAULT_AVATARS.male} 
                          className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-50 object-cover shadow-xl" 
                        />
                        <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-[4px] border-white rounded-full"></div>
                      </div>
                      <h3 className="font-black uppercase text-base md:text-lg tracking-tighter text-center line-clamp-1">{s.name}</h3>
                      <Badge variant="error" className="mt-2">{s.instrument} • {s.level}</Badge>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-2xl mb-6 space-y-3">
                      <div className="flex justify-between text-[9px] font-black uppercase">
                        <span className="text-slate-400">Ciclos Concluídos</span>
                        <span className="text-slate-900">{info?.cycles}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-black uppercase text-red-600">
                        <span>Aula Atual</span>
                        <span>{info?.currentCycleClass} / 4</span>
                      </div>
                    </div>

                    <Button 
                      onClick={() => setEditingStudent(s)} 
                      variant="primary"
                      className="w-full py-4"
                    >
                      <Edit className="w-3 h-3 mr-2" />
                      Editar Ficha
                    </Button>
                  </Card>
                );
              })}
              </div>
            </div>
          )}

          {activeView === 'courses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Meus Cursos</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conteúdo Educacional</p>
                </div>
                <Button onClick={() => setIsAddingCourse(true)} className="px-6">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Curso
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.map(course => (
                  <Card key={course.id} className="flex flex-col h-full group border-slate-200">
                  <div className="flex justify-between items-start mb-6">
                    <Badge variant="error">{course.instrument} • {course.level}</Badge>
                    <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600">
                      {course.modules?.length || 0} Módulos
                    </Badge>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-10 leading-tight flex-1 text-slate-900">{course.title}</h3>
                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <Button 
                      variant="outline" 
                      onClick={() => setManagingAccessCourse(course)}
                      className="border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      Acessos
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={() => setEditingCourseContent(course)}
                    >
                      Aulas
                    </Button>
                  </div>
                </Card>
              ))}
              </div>
            </div>
          )}

          {activeView === 'schedules' && (
            <div className="space-y-12">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Agenda de Aulas</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gestão Semanal e Relatórios</p>
                </div>
                <Button onClick={() => setIsAddingSchedule(true)} className="px-6">
                  <Plus className="w-4 h-4 mr-2" />
                  Agendar Aula
                </Button>
              </div>

              {/* Aulas Pendentes por Semana */}
              <section className="space-y-8">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Aulas Pendentes por Semana</h3>
                  <div className="h-px flex-1 bg-slate-100"></div>
                </div>

                {(() => {
                  const pendingSchedules = [...schedules]
                    .filter(s => s.status === 'PENDING')
                    .sort((a, b) => new Date(`${a.date.replace(/-/g, '\/')}T${a.time || '00:00:00'}`).getTime() - new Date(`${b.date.replace(/-/g, '\/')}T${b.time || '00:00:00'}`).getTime());
                  
                  // Group by week
                  const weeks: { [key: string]: ScheduledClass[] } = {};
                  pendingSchedules.forEach(s => {
                    const date = new Date(s.date.replace(/-/g, '\/'));
                    const day = date.getDay();
                    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
                    const startOfWeek = new Date(date.setDate(diff));
                    const weekKey = startOfWeek.toLocaleDateString('pt-BR');
                    if (!weeks[weekKey]) weeks[weekKey] = [];
                    weeks[weekKey].push(s);
                  });

                  const sortedWeeks = Object.keys(weeks).sort((a, b) => {
                    const [da, ma, ya] = a.split('/').map(Number);
                    const [db, mb, yb] = b.split('/').map(Number);
                    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
                  });

                  if (sortedWeeks.length === 0) {
                    return (
                      <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhuma aula pendente agendada.</p>
                      </div>
                    );
                  }

                  return sortedWeeks.map(week => (
                    <div key={week} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-900 text-white border-none px-4 py-1">
                          Semana de {week}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {weeks[week].sort((a, b) => new Date(a.date.replace(/-/g, '\/')).getTime() - new Date(b.date.replace(/-/g, '\/')).getTime()).map(sc => {
                          const student = students.find(s => s.id === sc.studentId);
                          const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                          const dayOfWeek = days[new Date(sc.date.replace(/-/g, '\/')).getDay()];
                          
                          return (
                            <Card key={sc.id} className="p-6 border-slate-100 hover:border-red-600 transition-all group relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-2">
                                <Badge variant="warning" className="text-[8px]">Pendente</Badge>
                              </div>
                              <div className="flex items-center gap-4 mb-4">
                                <img src={student?.avatar || DEFAULT_AVATARS.male} className="w-12 h-12 rounded-full border-2 border-slate-100 object-cover" alt="S" />
                                <div>
                                  <h4 className="font-black uppercase text-sm tracking-tight group-hover:text-red-600 transition-colors">
                                    {student?.name || sc.studentName || 'Aluno não encontrado'}
                                  </h4>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">{student?.instrument} • {student?.level}</p>
                                </div>
                              </div>
                              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black uppercase text-slate-400">Dia</span>
                                  <span className="text-xs font-black uppercase">{dayOfWeek}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                  <span className="text-[10px] font-black uppercase text-slate-400">Horário</span>
                                  <span className="text-xs font-black uppercase">{sc.time}</span>
                                </div>
                              </div>
                              <div className="mt-6 flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    className="flex-1 text-[9px] bg-green-600 hover:bg-green-700"
                                    onClick={() => onUpdateSchedule(sc.id, 'COMPLETED')}
                                  >
                                    Finalizar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="flex-1 text-[9px] border-red-600 text-red-600 hover:bg-red-50"
                                    onClick={() => onUpdateSchedule(sc.id, 'ABSENT')}
                                  >
                                    Falta
                                  </Button>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="w-full text-slate-400 hover:text-red-600 text-[8px] uppercase font-black"
                                  onClick={() => { if(confirm('Excluir agendamento?')) onDeleteSchedule(sc.id); }}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Excluir
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </section>

              {/* Relatório de Aulas Realizadas */}
              <section className="space-y-8 pt-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter whitespace-nowrap">Relatório de Aulas Realizadas</h3>
                    <div className="h-px flex-1 bg-slate-100 hidden md:block"></div>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Buscar por aluno..."
                      value={scheduleSearchTerm}
                      onChange={e => setScheduleSearchTerm(e.target.value)}
                      className="pl-12 py-3 bg-slate-50 border-none rounded-2xl text-xs"
                    />
                  </div>
                </div>

                <Card className="overflow-hidden border-none shadow-xl">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[800px]">
                      <thead className="bg-slate-950 text-white">
                        <tr>
                          <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest">Aluno</th>
                          <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest">Data</th>
                          <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest">Horário</th>
                          <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest">Status</th>
                          <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const filtered = schedules
                            .filter(s => s.status === 'COMPLETED' || s.status === 'ABSENT')
                            .filter(s => {
                              const student = students.find(st => st.id === s.studentId);
                              return (student?.name || '').toLowerCase().includes(scheduleSearchTerm.toLowerCase());
                            })
                            .sort((a, b) => new Date(`${b.date.replace(/-/g, '\/')}T${b.time || '00:00:00'}`).getTime() - new Date(`${a.date.replace(/-/g, '\/')}T${a.time || '00:00:00'}`).getTime());

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="p-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                  Nenhuma aula concluída encontrada.
                                </td>
                              </tr>
                            );
                          }

                          // Group by month
                          const groups: { [key: string]: ScheduledClass[] } = {};
                          filtered.forEach(s => {
                            const date = new Date(s.date.replace(/-/g, '\/'));
                            const monthKey = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                            if (!groups[monthKey]) groups[monthKey] = [];
                            groups[monthKey].push(s);
                          });

                          return Object.keys(groups).map(month => (
                            <React.Fragment key={month}>
                              <tr className="bg-slate-50/50">
                                <td colSpan={5} className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] border-y border-slate-100">
                                  {month}
                                </td>
                              </tr>
                              {groups[month].map(sc => (
                                <tr key={sc.id} className={`hover:bg-slate-50 transition-colors group ${sc.status === 'ABSENT' ? 'opacity-70' : ''}`}>
                                  <td className="p-6 md:p-8">
                                    <div className="flex items-center gap-4">
                                      <img src={students.find(s => s.id === sc.studentId)?.avatar || DEFAULT_AVATARS.male} className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover" alt="S" />
                                      <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-tight">
                                          {students.find(s => s.id === sc.studentId)?.name || sc.studentName || 'Aluno não encontrado'}
                                        </span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{students.find(s => s.id === sc.studentId)?.instrument}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-6 md:p-8">
                                    <span className="text-xs font-black uppercase">{new Date(sc.date.replace(/-/g, '\/')).toLocaleDateString('pt-BR')}</span>
                                  </td>
                                  <td className="p-6 md:p-8">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sc.time}</span>
                                  </td>
                                  <td className="p-6 md:p-8">
                                    <Badge variant={sc.title?.includes('[FALTA]') ? 'error' : 'success'}>
                                      {sc.title?.includes('[FALTA]') ? 'Falta' : 'Concluído'}
                                    </Badge>
                                  </td>
                                  <td className="p-6 md:p-8 text-center">
                                    <Button 
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onUpdateSchedule(sc.id, 'PENDING')}
                                      className="min-w-[100px]"
                                    >
                                      Reabrir
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            </div>
          )}

          {activeView === 'payments' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Fluxo de Caixa</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gestão Financeira</p>
                </div>
                <Button onClick={() => setIsAddingPayment(true)} className="px-6">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Lançamento
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-2 border-red-600 text-slate-900 p-8 shadow-xl relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <Activity className="w-32 h-32 text-red-600" />
                  </div>
                  <p className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-2">Mensal (Pago)</p>
                  <h3 className="text-4xl font-black tracking-tighter leading-none">R$ {monthlyTotal.toLocaleString('pt-BR')}</h3>
                </Card>
                <Card className="p-8 shadow-xl border-2 border-slate-900 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <CheckCircle2 className="w-32 h-32 text-slate-900" />
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Anual (Total)</p>
                  <h3 className="text-4xl font-black tracking-tighter leading-none text-slate-900">R$ {annualTotal.toLocaleString('pt-BR')}</h3>
                </Card>
                <Card className="p-8 border-2 border-slate-100 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Pendentes</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black tracking-tighter leading-none text-slate-900">
                      R$ {payments.filter(p => p.status === 'PENDING').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString('pt-BR')}
                    </h3>
                    <Badge variant="warning" className="text-[8px]">Atenção</Badge>
                  </div>
                </Card>
              </div>

              <Card className="overflow-hidden border-none shadow-xl">
                 <div className="overflow-x-auto custom-scrollbar">
                   <table className="w-full text-left min-w-[700px]">
                     <thead className="bg-slate-950 text-white">
                       <tr>
                         <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest">Pagador</th>
                         <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest">Valor</th>
                         <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest">Vencimento</th>
                         <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest">Status</th>
                         <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest text-center">Ação</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {payments.sort((a, b) => new Date(b.dueDate.replace(/-/g, '\/')).getTime() - new Date(a.dueDate.replace(/-/g, '\/')).getTime()).map(p => (
                         <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-6 md:p-8">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black">
                                 {students.find(s => s.id === p.studentId)?.name?.charAt(0) || '?'}
                               </div>
                               <span className="text-xs font-black uppercase tracking-tight">{students.find(s => s.id === p.studentId)?.name}</span>
                             </div>
                           </td>
                           <td className="p-6 md:p-8">
                             <span className="text-sm font-black text-slate-900">R$ {p.amount.toFixed(2)}</span>
                           </td>
                           <td className="p-6 md:p-8">
                             <span className="text-xs font-bold text-slate-400 uppercase">{new Date(p.dueDate.replace(/-/g, '\/')).toLocaleDateString('pt-BR')}</span>
                           </td>
                           <td className="p-6 md:p-8">
                             <Badge variant={p.status === 'PAID' ? 'success' : 'warning'}>
                               {p.status === 'PAID' ? 'Recebido' : 'Pendente'}
                             </Badge>
                           </td>
                           <td className="p-6 md:p-8 text-center">
                             <div className="flex items-center justify-center gap-2">
                               <Button 
                                 size="sm"
                                 variant={p.status === 'PAID' ? 'outline' : 'primary'}
                                 onClick={() => onUpdatePayment(p.id, { status: p.status === 'PAID' ? 'PENDING' : 'PAID' })}
                                 className="min-w-[100px]"
                               >
                                 {p.status === 'PAID' ? 'Estornar' : 'Confirmar'}
                               </Button>
                               <Button 
                                 size="sm"
                                 variant="ghost"
                                 onClick={() => { if(confirm('Excluir lançamento?')) onDeletePayment(p.id); }}
                                 className="text-red-600 hover:bg-red-50"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </Card>
            </div>
          )}

          {activeView === 'materials' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Materiais de Estudo</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gestão de Arquivos e PDFs</p>
                </div>
                <Button onClick={() => setIsAddingMaterial(true)} className="px-6">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Material
                </Button>
              </div>

              <Card className="overflow-hidden border-none shadow-xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-slate-950 text-white">
                      <tr>
                        <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest">Título</th>
                        <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest">Instr. / Nível</th>
                        <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest">Curso Relacionado</th>
                        <th className="p-6 md:p-8 text-[10px] font-black uppercase tracking-widest text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {materials.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-6 md:p-8">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-red-600" />
                              <span className="text-xs font-black uppercase tracking-tight">{m.title}</span>
                            </div>
                          </td>
                          <td className="p-6 md:p-8">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.instrument} • {m.level}</span>
                          </td>
                          <td className="p-6 md:p-8">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {courses.find(c => c.id === m.courseId)?.title || 'Geral (Todos do Nível)'}
                            </span>
                          </td>
                          <td className="p-6 md:p-8 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingMaterial(m)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm"
                                variant="ghost"
                                onClick={() => { if(confirm('Excluir material?')) onDeleteMaterial(m.id); }}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {materials.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            Nenhum material cadastrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Modals */}
        {managingAccessCourse && (
          <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-6 md:p-12 max-h-[90vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-6 md:mb-10">
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter">Acessos: {managingAccessCourse.title}</h3>
                <button onClick={() => setManagingAccessCourse(null)} className="text-3xl md:text-4xl font-black hover:text-red-600 transition-colors">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4 pr-4 custom-scrollbar">
                {students.filter(s => s.role === 'STUDENT').map(s => (
                  <label key={s.id} className="flex items-center justify-between p-4 md:p-6 border-2 border-gray-100 rounded-[1.5rem] md:rounded-3xl cursor-pointer hover:border-red-600 transition-all group">
                    <div className="flex items-center gap-3 md:gap-4">
                      <img src={s.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover" alt="S" />
                      <div>
                        <p className="text-[10px] md:text-xs font-black uppercase tracking-tight">{s.name}</p>
                        <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase">{s.instrument}</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={managingAccessCourse.studentIds.includes(s.id)}
                      onChange={() => handleToggleAccess(managingAccessCourse.id, s.id)}
                      className="w-5 h-5 md:w-6 md:h-6 accent-red-600 rounded-full"
                    />
                  </label>
                ))}
              </div>
              <button onClick={() => setManagingAccessCourse(null)} className="w-full mt-6 md:mt-10 bg-black text-white py-4 md:py-6 rounded-2xl md:rounded-[2rem] text-[10px] md:text-xs font-black uppercase shadow-2xl hover:bg-red-600 transition-all">Pronto</button>
            </div>
          </div>
        )}
        
        {/* editingCourseContent modal remains similar as it is already quite complex */}
        {editingCourseContent && (
          <div className="fixed inset-0 bg-white z-[600] overflow-y-auto flex flex-col">
            <header className="bg-black text-white p-4 md:p-6 sticky top-0 flex justify-between items-center z-[700] shadow-xl">
              <div className="flex items-center gap-3 md:gap-4">
                <button onClick={() => setEditingCourseContent(null)} className="text-white hover:text-red-600 transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
                </button>
                <h2 className="text-sm md:text-2xl font-black uppercase tracking-tighter truncate max-w-[150px] md:max-w-none">Conteúdo: {editingCourseContent.title}</h2>
              </div>
              <button 
                onClick={async () => { setIsSyncing(true); await onUpdateCourseContent(editingCourseContent); setIsSyncing(false); setEditingCourseContent(null); }}
                className="bg-red-600 text-white px-5 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase shadow-xl active:scale-95"
              >
                Salvar
              </button>
            </header>
            {/* Rest of editing content... */}
            <div className="max-w-4xl mx-auto w-full p-4 md:p-12 space-y-8 md:space-y-12 pb-32">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-4 border-black pb-4 md:pb-6 gap-4 md:gap-6">
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter">Estrutura de Aulas</h3>
                <button onClick={addModule} className="w-full sm:w-auto bg-black text-white px-6 md:px-10 py-3 md:py-5 rounded-xl md:rounded-3xl text-[9px] md:text-[10px] font-black uppercase shadow-xl">+ Novo Módulo</button>
              </div>
              <div className="space-y-10 md:space-y-16">
                {editingCourseContent.modules?.map((mod) => (
                  <div key={mod.id} className="bg-gray-50 rounded-[2rem] md:rounded-[3rem] p-5 md:p-12 border border-gray-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 mb-8 md:mb-12">
                      <input 
                        value={mod.title} 
                        onChange={e => { const updated = editingCourseContent.modules.map(m => m.id === mod.id ? { ...m, title: e.target.value } : m); setEditingCourseContent({...editingCourseContent, modules: updated}); }}
                        className="w-full sm:flex-1 bg-transparent text-lg md:text-2xl font-black uppercase tracking-tighter border-b-2 border-gray-300 py-2 md:py-3 outline-none focus:border-red-600 transition-colors"
                      />
                      <button onClick={() => { const updated = editingCourseContent.modules.filter(m => m.id !== mod.id); setEditingCourseContent({...editingCourseContent, modules: updated}); }} className="text-red-600 font-black text-[9px] md:text-[10px] uppercase bg-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl shadow-sm hover:bg-red-600 hover:text-white transition-all">Deletar</button>
                    </div>
                    <div className="space-y-6 md:space-y-10">
                      {mod.lessons.map((lesson) => (
                        <div key={lesson.id} className="bg-white border border-gray-100 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-6 md:mb-8 gap-4">
                            <input 
                              value={lesson.title} 
                              onChange={e => updateLesson(mod.id, lesson.id, { title: e.target.value })}
                              className="font-black uppercase text-sm md:text-base outline-none bg-transparent flex-1 border-b border-dashed border-gray-200 focus:border-red-600" 
                              placeholder="Título" 
                            />
                            <button onClick={() => { const updated = editingCourseContent.modules.map(m => m.id === mod.id ? { ...m, lessons: m.lessons.filter(l => l.id !== lesson.id) } : m); setEditingCourseContent({...editingCourseContent, modules: updated}); }} className="text-gray-300 hover:text-red-600 transition-colors">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-10">
                            <div className="space-y-1">
                              <label className="text-[8px] md:text-[9px] font-black uppercase text-gray-400 ml-3">Link Tutor</label>
                              <input value={lesson.videoArranjoUrl} onChange={e => updateLesson(mod.id, lesson.id, { videoArranjoUrl: e.target.value })} className="w-full border-2 border-gray-50 p-3 md:p-5 rounded-xl md:rounded-2xl text-[10px] font-bold bg-gray-50 focus:bg-white outline-none" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] md:text-[9px] font-black uppercase text-gray-400 ml-3">Link Base</label>
                              <input value={lesson.videoAoVivoUrl} onChange={e => updateLesson(mod.id, lesson.id, { videoAoVivoUrl: e.target.value })} className="w-full border-2 border-gray-50 p-3 md:p-5 rounded-xl md:rounded-2xl text-[10px] font-bold bg-gray-50 focus:bg-white outline-none" />
                            </div>
                          </div>
                          <textarea value={lesson.description} onChange={e => updateLesson(mod.id, lesson.id, { description: e.target.value })} className="w-full border-2 border-gray-50 p-4 md:p-6 rounded-[1.2rem] md:rounded-[2rem] text-[10px] font-medium resize-none bg-gray-50 outline-none" rows={3} placeholder="Sinopse..." />
                        </div>
                      ))}
                      <button onClick={() => addLesson(mod.id)} className="w-full border-4 border-dashed border-gray-200 py-6 md:py-10 rounded-[2rem] md:rounded-[3rem] text-[10px] md:text-[11px] font-black uppercase text-gray-300 hover:border-red-600 hover:text-red-600 transition-all">+ Nova Aula</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {editingStudent && (
          <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4 backdrop-blur-md">
            <Card className="bg-white w-full max-w-md p-8 md:p-10 space-y-6 md:space-y-10 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar relative rounded-[3rem]">
              <div className="flex justify-between items-center">
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter">Ficha Aluno</h3>
                <button type="button" onClick={() => setEditingStudent(null)} className="text-3xl md:text-4xl font-black hover:text-red-600 transition-colors">&times;</button>
              </div>
              <div className="flex flex-col items-center gap-4 md:gap-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                   <img src={editingStudent.avatar} className="w-28 h-28 md:w-40 md:h-40 rounded-full border-4 border-red-600 object-cover shadow-2xl" alt="Avatar" />
                   <div className="absolute bottom-1 right-1 bg-black text-white p-1.5 rounded-full border-2 border-white text-xs">📸</div>
                   <input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setEditingStudent({...editingStudent, avatar: r.result as string}); r.readAsDataURL(f); } }} className="hidden" accept="image/*" />
                </div>
              </div>
              <form onSubmit={async (e) => { e.preventDefault(); await onUpdateStudent(editingStudent); setEditingStudent(null); }} className="space-y-6">
                <Input 
                  label="Nome Completo"
                  value={editingStudent.name} 
                  onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} 
                />
                <Input 
                  label="E-mail"
                  type="email"
                  value={editingStudent.email || ''} 
                  onChange={e => setEditingStudent({...editingStudent, email: e.target.value})} 
                  placeholder="exemplo@email.com"
                />
                <Input 
                  label="WhatsApp"
                  value={editingStudent.whatsapp || ''} 
                  onChange={e => setEditingStudent({...editingStudent, whatsapp: e.target.value})} 
                  placeholder="(00) 00000-0000"
                />
                <Input 
                  label="URL da Foto de Perfil"
                  value={editingStudent.avatar || ''} 
                  onChange={e => setEditingStudent({...editingStudent, avatar: e.target.value})} 
                  placeholder="https://link-da-imagem.com/foto.jpg"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Instr.</label>
                    <select value={editingStudent.instrument} onChange={e => setEditingStudent({...editingStudent, instrument: e.target.value as Instrument})} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                      <option value="Violão">Violão</option>
                      <option value="Piano">Piano</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Nível</label>
                    <select value={editingStudent.level} onChange={e => setEditingStudent({...editingStudent, level: e.target.value as Level})} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                      <option value="NZ">NZ</option><option value="N1">N1</option><option value="N2">N2</option><option value="N3">N3</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Aulas Concluídas (Ciclo)</label>
                  <Input 
                    type="number"
                    value={editingStudent.totalCompletedClasses} 
                    onChange={e => setEditingStudent({...editingStudent, totalCompletedClasses: Number(e.target.value)})} 
                  />
                  <p className="text-[8px] font-bold text-slate-400 ml-4 uppercase">Cada 4 aulas fecham um ciclo.</p>
                </div>
                <div className="space-y-3 pt-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full py-4 border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest"
                    onClick={async () => {
                      const newPass = prompt("Digite a nova senha temporária para o aluno (mínimo 6 caracteres):");
                      if (newPass && newPass.length >= 6) {
                        setIsSyncing(true);
                        await onResetPassword(editingStudent.id, newPass);
                        setIsSyncing(false);
                      } else if (newPass) {
                        alert("A senha deve ter pelo menos 6 caracteres.");
                      }
                    }}
                  >
                    Redefinir Senha do Aluno
                  </Button>
                  <div className="flex gap-4">
                    <Button type="submit" className="flex-1 py-6">Salvar Alterações</Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={async () => { 
                        if(confirm('Excluir aluno permanentemente?')) { 
                          setIsSyncing(true);
                          await onDeleteStudent(editingStudent.id); 
                          setIsSyncing(false);
                          setEditingStudent(null); 
                        } 
                      }}
                      className="px-6 border-red-100 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          </div>
        )}

        {isAddingStudent && (
          <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4 backdrop-blur-md">
            <Card className="bg-white w-full max-w-md p-8 md:p-10 space-y-6 md:space-y-10 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar relative rounded-[3rem]">
              <div className="flex justify-between items-center">
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter">Novo Aluno</h3>
                <button type="button" onClick={() => setIsAddingStudent(false)} className="text-3xl md:text-4xl font-black hover:text-red-600 transition-colors">&times;</button>
              </div>
              <form onSubmit={async (e) => { 
                e.preventDefault(); 
                const formData = new FormData(e.currentTarget);
                const password = formData.get('password') as string;
                if (password.length < 6) {
                  alert("A senha deve ter pelo menos 6 caracteres.");
                  return;
                }
                const newStudent: User = {
                  id: crypto.randomUUID(),
                  email: formData.get('email') as string,
                  name: formData.get('name') as string,
                  whatsapp: formData.get('whatsapp') as string,
                  role: 'STUDENT',
                  instrument: formData.get('instrument') as Instrument,
                  level: formData.get('level') as Level,
                  avatar: DEFAULT_AVATARS.male,
                  totalCompletedClasses: 0
                };
                setIsSyncing(true);
                await onAddStudent(newStudent, password); 
                setIsSyncing(false);
                setIsAddingStudent(false); 
              }} className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-2xl space-y-1">
                  <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Informação Importante</p>
                  <p className="text-[10px] font-bold text-blue-800 leading-relaxed">
                    A senha definida aqui será a senha de acesso do aluno. 
                    Certifique-se de anotá-la para enviar ao estudante.
                  </p>
                </div>
                <Input label="Nome Completo" name="name" required placeholder="Ex: João Silva" />
                <Input label="WhatsApp" name="whatsapp" placeholder="(00) 00000-0000" />
                <Input label="E-mail" name="email" type="email" required placeholder="exemplo@email.com" />
                <Input label="Senha Temporária" name="password" type="password" required placeholder="••••••••" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Instr.</label>
                    <select name="instrument" className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                      <option value="Violão">Violão</option>
                      <option value="Piano">Piano</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Nível</label>
                    <select name="level" className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                      <option value="NZ">NZ</option><option value="N1">N1</option><option value="N2">N2</option><option value="N3">N3</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" className="w-full py-6 mt-4">Cadastrar Aluno</Button>
              </form>
            </Card>
          </div>
        )}

        {isAddingCourse && (
          <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4 backdrop-blur-md">
            <Card className="bg-white w-full max-w-md p-8 md:p-10 space-y-6 md:space-y-10 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar relative rounded-[3rem]">
              <div className="flex justify-between items-center">
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter">Novo Curso</h3>
                <button type="button" onClick={() => setIsAddingCourse(false)} className="text-3xl md:text-4xl font-black hover:text-red-600 transition-colors">&times;</button>
              </div>
              <form onSubmit={async (e) => { 
                e.preventDefault(); 
                const formData = new FormData(e.currentTarget);
                const newCourse: Course = {
                  id: crypto.randomUUID(),
                  title: formData.get('title') as string,
                  instrument: formData.get('instrument') as Instrument,
                  level: formData.get('level') as Level,
                  description: formData.get('description') as string,
                  modules: [],
                  studentIds: []
                };
                setIsSyncing(true);
                await onAddCourse(newCourse); 
                setIsSyncing(false);
                setIsAddingCourse(false); 
              }} className="space-y-6">
                <Input label="Título do Curso" name="title" required placeholder="Ex: Piano Erudito N1" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Instr.</label>
                    <select name="instrument" className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                      <option value="Violão">Violão</option>
                      <option value="Piano">Piano</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Nível</label>
                    <select name="level" className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                      <option value="NZ">NZ</option><option value="N1">N1</option><option value="N2">N2</option><option value="N3">N3</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Descrição</label>
                  <textarea name="description" className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all min-h-[100px]" placeholder="Breve descrição do curso..." />
                </div>
                <Button type="submit" className="w-full py-6 mt-4">Criar Curso</Button>
              </form>
            </Card>
          </div>
        )}

        {isAddingSchedule && (
          <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4 backdrop-blur-md">
            <Card className="bg-white w-full max-w-md p-8 md:p-10 space-y-6 md:space-y-10 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar relative rounded-[3rem]">
              <div className="flex justify-between items-center">
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter">Agendar Aula</h3>
                <button type="button" onClick={() => setIsAddingSchedule(false)} className="text-3xl md:text-4xl font-black hover:text-red-600 transition-colors">&times;</button>
              </div>
              <form onSubmit={async (e) => { 
                e.preventDefault(); 
                const formData = new FormData(e.currentTarget);
                const studentId = formData.get('studentId') as string;
                const student = students.find(s => s.id === studentId);
                const newSchedule: ScheduledClass = {
                   id: crypto.randomUUID(),
                   studentId,
                   studentName: student?.name, // Salva o nome para facilitar visualização no Supabase
                   teacherId: user.id,
                   date: formData.get('date') as string,
                   time: formData.get('time') as string,
                   title: formData.get('title') as string,
                   status: 'PENDING',
                   instrument: student?.instrument || 'Violão'
                };
                setIsSyncing(true);
                await onAddSchedule(newSchedule); 
                setIsSyncing(false);
                setIsAddingSchedule(false); 
              }} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Aluno</label>
                  <select name="studentId" required className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                    {students.filter(s => s.role === 'STUDENT').map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <Input label="Título/Conteúdo" name="title" placeholder="Ex: Aula de Campo" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Data" name="date" type="date" required />
                  <Input label="Horário" name="time" type="time" required />
                </div>
                <Button type="submit" className="w-full py-6 mt-4">Confirmar Agendamento</Button>
              </form>
            </Card>
          </div>
        )}

        {isAddingPayment && (
          <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4 backdrop-blur-md">
            <Card className="bg-white w-full max-w-md p-8 md:p-10 space-y-6 md:space-y-10 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar relative rounded-[3rem]">
              <div className="flex justify-between items-center">
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter">Novo Lançamento</h3>
                <button type="button" onClick={() => setIsAddingPayment(false)} className="text-3xl md:text-4xl font-black hover:text-red-600 transition-colors">&times;</button>
              </div>
              <form onSubmit={async (e) => { 
                e.preventDefault(); 
                const formData = new FormData(e.currentTarget);
                const newPayment: Payment = {
                  id: crypto.randomUUID(),
                  studentId: formData.get('studentId') as string,
                  amount: Number(formData.get('amount')),
                  dueDate: formData.get('dueDate') as string,
                  status: 'PENDING'
                };
                setIsSyncing(true);
                await onAddPayment(newPayment); 
                setIsSyncing(false);
                setIsAddingPayment(false); 
              }} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Aluno</label>
                  <select name="studentId" required className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                    {students.filter(s => s.role === 'STUDENT').map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <Input label="Valor (R$)" name="amount" type="number" step="0.01" required placeholder="0.00" />
                <Input label="Vencimento" name="dueDate" type="date" required />
                <Button type="submit" className="w-full py-6 mt-4">Registrar Pagamento</Button>
              </form>
            </Card>
          </div>
        )}

        {isSendingBroadcast && (
          <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4 backdrop-blur-md">
            <Card className="bg-white w-full max-w-2xl p-8 md:p-10 space-y-6 md:space-y-10 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar relative rounded-[3rem]">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter">Dica do Professor</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Envio via WhatsApp</p>
                </div>
                <button type="button" onClick={() => setIsSendingBroadcast(false)} className="text-3xl md:text-4xl font-black hover:text-red-600 transition-colors">&times;</button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Mensagem do Lembrete</label>
                  <textarea 
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full border-2 border-gray-100 p-6 rounded-3xl text-sm font-bold outline-none focus:border-red-600 transition-all min-h-[120px] resize-none"
                    placeholder="Escreva a mensagem aqui..."
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2">Lista de Alunos ({students.filter(s => s.role === 'STUDENT' && s.whatsapp).length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {students.filter(s => s.role === 'STUDENT' && s.whatsapp).length > 0 ? (
                      students.filter(s => s.role === 'STUDENT' && s.whatsapp).map(s => (
                        <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-red-600 transition-all">
                          <div className="flex items-center gap-3">
                            <img src={s.avatar || DEFAULT_AVATARS.male} className="w-8 h-8 rounded-full object-cover" />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase truncate max-w-[120px]">{s.name}</span>
                              <span className="text-[8px] font-bold text-slate-400">{s.whatsapp}</span>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className={`${sentStudents.includes(s.id) ? 'bg-emerald-100 text-emerald-600' : 'bg-green-500 text-white hover:bg-green-600'} p-2 rounded-xl transition-all`}
                            onClick={() => {
                              const phone = s.whatsapp?.replace(/\D/g, '');
                              const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(broadcastMessage)}`;
                              window.open(url, '_blank');
                              if (!sentStudents.includes(s.id)) {
                                setSentStudents(prev => [...prev, s.id]);
                              }
                            }}
                          >
                            {sentStudents.includes(s.id) ? <CheckCircle2 className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full p-8 bg-slate-50 rounded-2xl text-center border-2 border-dashed border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum aluno com WhatsApp cadastrado.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                  <p className="text-[10px] font-bold text-red-600 leading-relaxed">
                    <strong>Dica do Professor:</strong> Clique no botão verde ao lado de cada aluno. Isso abrirá uma nova aba com a conversa e a mensagem já preenchida. Basta apertar o botão de enviar no WhatsApp.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {isAddingMaterial && (
          <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4 backdrop-blur-md">
            <Card className="bg-white w-full max-w-md p-8 md:p-10 space-y-6 md:space-y-10 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar relative rounded-[3rem]">
              <div className="flex justify-between items-center">
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter">Novo Material</h3>
                <button type="button" onClick={() => setIsAddingMaterial(false)} className="text-3xl md:text-4xl font-black hover:text-red-600 transition-colors">&times;</button>
              </div>
              <form onSubmit={async (e) => { 
                e.preventDefault(); 
                const formData = new FormData(e.currentTarget);
                const newMaterial: Material = {
                  id: crypto.randomUUID(),
                  title: formData.get('title') as string,
                  fileUrl: formData.get('fileUrl') as string,
                  instrument: formData.get('instrument') as Instrument,
                  level: formData.get('level') as Level,
                  courseId: formData.get('courseId') as string || undefined
                };
                setIsSyncing(true);
                await onAddMaterial(newMaterial); 
                setIsSyncing(false);
                setIsAddingMaterial(false); 
              }} className="space-y-6">
                <Input label="Título do Material" name="title" required placeholder="Ex: PDF de Escalas Maiores" />
                <Input label="URL do Arquivo (PDF/Link)" name="fileUrl" required placeholder="https://..." />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Instr.</label>
                    <select name="instrument" className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                      <option value="Violão">Violão</option>
                      <option value="Piano">Piano</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Nível</label>
                    <select name="level" className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                      <option value="NZ">NZ</option><option value="N1">N1</option><option value="N2">N2</option><option value="N3">N3</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Curso Relacionado (Opcional)</label>
                  <select name="courseId" className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                    <option value="">Geral (Todos do Nível)</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title} ({c.instrument})</option>
                    ))}
                  </select>
                </div>

                <Button type="submit" className="w-full py-6 mt-4">Criar Material</Button>
              </form>
            </Card>
          </div>
        )}

        {editingMaterial && (
          <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4 backdrop-blur-md">
            <Card className="bg-white w-full max-w-md p-8 md:p-10 space-y-6 md:space-y-10 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar relative rounded-[3rem]">
              <div className="flex justify-between items-center">
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter">Editar Material</h3>
                <button type="button" onClick={() => setEditingMaterial(null)} className="text-3xl md:text-4xl font-black hover:text-red-600 transition-colors">&times;</button>
              </div>
              <form onSubmit={async (e) => { 
                e.preventDefault(); 
                const formData = new FormData(e.currentTarget);
                const updates: Partial<Material> = {
                  title: formData.get('title') as string,
                  fileUrl: formData.get('fileUrl') as string,
                  instrument: formData.get('instrument') as Instrument,
                  level: formData.get('level') as Level,
                  courseId: formData.get('courseId') as string || undefined
                };
                setIsSyncing(true);
                await onUpdateMaterial(editingMaterial.id, updates); 
                setIsSyncing(false);
                setEditingMaterial(null); 
              }} className="space-y-6">
                <Input label="Título do Material" name="title" required defaultValue={editingMaterial.title} />
                <Input label="URL do Arquivo (PDF/Link)" name="fileUrl" required defaultValue={editingMaterial.fileUrl} />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Instr.</label>
                    <select name="instrument" defaultValue={editingMaterial.instrument} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                      <option value="Violão">Violão</option>
                      <option value="Piano">Piano</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Nível</label>
                    <select name="level" defaultValue={editingMaterial.level} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                      <option value="NZ">NZ</option><option value="N1">N1</option><option value="N2">N2</option><option value="N3">N3</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-4">Curso Relacionado (Opcional)</label>
                  <select name="courseId" defaultValue={editingMaterial.courseId || ""} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all">
                    <option value="">Geral (Todos do Nível)</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title} ({c.instrument})</option>
                    ))}
                  </select>
                </div>

                <Button type="submit" className="w-full py-6 mt-4">Salvar Alterações</Button>
              </form>
            </Card>
          </div>
        )}

      </main>
    </div>
  );
};

const SidebarLink: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center px-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] rounded-3xl mb-1 transition-all active:scale-95 ${
      active 
        ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
        : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
    }`}
  >
    <span className="mr-4">{icon}</span>
    {label}
  </button>
);

export default AdminDashboard;
