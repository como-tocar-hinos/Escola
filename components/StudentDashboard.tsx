
import React, { useState, useRef } from 'react';
import { User, Course, ScheduledClass, Payment, LessonDB, Quote, Recital } from '../types';
import { parseLocalDate, formatDisplayDate, getMonthName, getShortMonthName, getDayOfMonth, getVideoEmbedUrl } from '../utils';
import CoursePlayer from './CoursePlayer';
import { DEFAULT_AVATARS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  LogOut, 
  BookOpen, 
  Calendar, 
  CreditCard, 
  FileText, 
  Settings, 
  Play, 
  CheckCircle2, 
  Clock,
  Mic2,
  Activity,
  XCircle,
  X
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

interface StudentDashboardProps {
  user: User;
  students: User[];
  onLogout: () => void;
  courses: Course[];
  schedules: ScheduledClass[];
  payments: Payment[];
  quotes?: Quote[];
  onUpdateProfile: (user: User) => Promise<void>;
  recitals: Recital[];
  onUpdateRecital: (id: string, completed: boolean) => Promise<void>;
}

type Tab = 'overview' | 'courses' | 'practice' | 'cronograma' | 'payments' | 'recitais';

  const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
    user, students = [], onLogout, courses = [], schedules = [], payments = [], quotes = [], onUpdateProfile,
    recitals = [], onUpdateRecital
  }) => {
    console.log("StudentDashboard Render:", { userEmail: user.email, userRole: user.role, coursesCount: courses.length });
    const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [viewingRecitalVideo, setViewingRecitalVideo] = useState<Recital | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<User>(user);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lógica de filtragem robusta:
  // Se o aluno foi cadastrado pelo Admin, ele pode ter um ID diferente do ID do Supabase Auth.
  // Procuramos por qualquer perfil que tenha o mesmo e-mail para garantir que ele veja seus dados.
  const myProfileIds = (students || [])
    .filter(s => s.email?.toLowerCase() === user.email?.toLowerCase())
    .map(s => s.id);
  
  // Inclui o ID atual do usuário logado na lista de IDs permitidos
  if (!myProfileIds.includes(user.id)) {
    myProfileIds.push(user.id);
  }

  // Filtra apenas o que pertence ao aluno logado (usando qualquer um dos IDs encontrados)
  const myCourses = (courses || []).filter(c => 
    c.studentIds?.some(id => myProfileIds.includes(id))
  );
  
  const mySchedules = (schedules || [])
    .filter(s => myProfileIds.includes(s.studentId))
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
  
  const myPayments = (payments || []).filter(p => myProfileIds.includes(p.studentId));
  
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateProfile(profileForm);
      setIsEditingProfile(false);
    } catch (err) {
      alert("Erro ao salvar perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm({ ...profileForm, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (viewingCourse) {
    return (
      <CoursePlayer course={viewingCourse} onBack={() => setViewingCourse(null)} />
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="bg-white text-slate-950 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-50 border-b border-slate-200 backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-600/20">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">
              Como <span className="text-red-600">Tocar</span> Hinos
            </h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-1">Toque Sacro de Forma Fácil</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-right">
            <div className="hidden md:block">
              <p className="text-sm font-black uppercase leading-none">{user.name}</p>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1.5">{user.instrument} • {user.level}</p>
            </div>
            <motion.img 
              whileHover={{ scale: 1.1 }}
              src={user.avatar || DEFAULT_AVATARS.male} 
              className="w-10 h-10 rounded-full border-2 border-red-600 object-cover shadow-lg cursor-pointer" 
              onClick={() => setIsEditingProfile(true)}
              alt="Avatar"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-slate-950 hover:bg-red-600 hover:text-white">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 sticky top-[73px] z-40 overflow-x-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Activity className="w-4 h-4" />} label="Geral" />
          <TabButton active={activeTab === 'courses'} onClick={() => setActiveTab('courses')} icon={<BookOpen className="w-4 h-4" />} label="Cursos" />
          <TabButton active={activeTab === 'practice'} onClick={() => setActiveTab('practice')} icon={<Music className="w-4 h-4" />} label="Página de Estudos" />
          <TabButton active={activeTab === 'cronograma'} onClick={() => setActiveTab('cronograma')} icon={<FileText className="w-4 h-4" />} label="Cronograma" />
          <TabButton active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={<CreditCard className="w-4 h-4" />} label="Financeiro" />
          <TabButton active={activeTab === 'recitais'} onClick={() => setActiveTab('recitais')} icon={<Mic2 className="w-4 h-4" />} label="Recitais" />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-12">
                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Próximas Aulas</h3>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>

                  <div className="space-y-6">
                    {mySchedules.filter(s => s.status !== 'COMPLETED').length > 0 ? (
                      mySchedules.filter(s => s.status !== 'COMPLETED').map(sc => (
                        <Card key={sc.id} className="flex flex-col md:flex-row justify-between items-center gap-8 group border-slate-100">
                          <div className="flex items-center gap-8 w-full md:w-auto">
                            <div className="bg-slate-950 text-white w-20 h-20 rounded-3xl flex flex-col items-center justify-center font-black shadow-xl shrink-0">
                              <span className="text-[10px] uppercase opacity-50">{getShortMonthName(sc.date)}</span>
                              <span className="text-3xl leading-none">{getDayOfMonth(sc.date)}</span>
                            </div>
                            <div>
                              <h4 className="text-2xl font-black uppercase tracking-tighter group-hover:text-red-600 transition-colors leading-tight">{sc.title || 'Aula Presencial'}</h4>
                              <div className="flex items-center gap-3 mt-2">
                                <Badge variant="outline" className="flex items-center gap-1 border-slate-200">
                                  <Clock className="w-3 h-3" />
                                  {sc.time}
                                </Badge>
                                <Badge variant="outline" className="border-slate-200">{sc.instrument}</Badge>
                                <Badge variant="warning">{sc.status}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="w-full md:w-auto px-10 py-5 rounded-3xl text-[9px] font-black uppercase text-slate-400 border border-slate-100 text-center">
                            Aguardando Presença
                          </div>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-20 bg-slate-50 rounded-4xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">Sua agenda está livre por enquanto.</p>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Relatórios de Ciclos Concluídos</h3>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(() => {
                      const completed = mySchedules.filter(s => s.status === 'COMPLETED');
                      const cycleCount = Math.floor(completed.length / 4);
                      if (cycleCount === 0) {
                        return (
                          <div className="col-span-full text-center py-12 bg-slate-50 rounded-3xl border border-slate-100">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhum ciclo de 4 aulas concluído ainda.</p>
                          </div>
                        );
                      }
                      return Array.from({ length: cycleCount }).map((_, i) => (
                        <Card key={i} className="p-6 border-slate-100 hover:border-red-600 transition-all group">
                          <div className="flex items-center justify-between mb-4">
                            <div className="bg-slate-950 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black">
                              {i + 1}
                            </div>
                            <Badge variant="success">Ciclo Concluído</Badge>
                          </div>
                          <h4 className="font-black uppercase tracking-tighter text-lg mb-2">Ciclo de Aprendizado {i + 1}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ciclo de 4 aulas finalizado</p>
                        </Card>
                      ));
                    })()}
                  </div>
                </section>
              </div>

              <aside className="space-y-8">
                <Card className="p-8 border-slate-200">
                   <h3 className="text-xl font-black uppercase mb-8 tracking-tighter flex items-center gap-3">
                     <CheckCircle2 className="w-5 h-5 text-red-600" />
                     Histórico
                   </h3>
                   <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                     {mySchedules.filter(s => s.status === 'COMPLETED').map(sc => (
                       <div key={sc.id} className={`border-l-4 ${sc.title?.includes('[FALTA]') ? 'border-red-400' : 'border-red-600'} pl-6 py-4 bg-slate-50 rounded-r-3xl flex justify-between items-center group hover:bg-slate-100 transition-all ${sc.title?.includes('[FALTA]') ? 'opacity-70' : ''}`}>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">{formatDisplayDate(sc.date)}</p>
                            <p className="text-sm font-black uppercase tracking-tighter group-hover:text-red-600 truncate max-w-[150px]">{sc.title?.replace('[FALTA]', '').trim() || 'Aula Concluída'}</p>
                            {sc.title?.includes('[FALTA]') && <Badge variant="error" className="mt-1">Falta</Badge>}
                          </div>
                          <div className={`${sc.title?.includes('[FALTA]') ? 'bg-red-50 text-red-400' : 'bg-emerald-500/10 text-emerald-600'} p-2 rounded-full shrink-0`}>
                            {sc.title?.includes('[FALTA]') ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </div>
                       </div>
                     ))}
                     {mySchedules.filter(s => s.status === 'COMPLETED').length === 0 && (
                       <p className="text-center text-xs font-black uppercase opacity-50 py-8">Nenhuma aula concluída.</p>
                     )}
                   </div>
                </Card>

                <Card className="bg-white border-2 border-red-600 text-slate-900 p-8">
                  <h4 className="font-black uppercase tracking-widest text-[10px] mb-2 text-red-600">Citação inspirada</h4>
                  {(() => {
                    const defaultQuote = {
                      text: 'O emprego de <strong>instrumentos de música</strong> não é absolutamente objetável. Eles eram usados nos cultos dos tempos antigos. Os adoradores louvavam a Deus com a harpa e o címbalo, e <strong>a música deve ter seu lugar em nossos cultos</strong>. Isso faz aumentar o interesse. Alegro-me de ouvir aqui os instrumentos de música. <strong>Deus quer que os tenhamos</strong>. Quer que O louvemos, de alma e coração e com a nossa voz, engrandecendo Seu nome perante o mundo.',
                      reference: 'MI - 29. 1, 2'
                    };

                    let selectedQuote = defaultQuote;
                    if (quotes.length > 0) {
                      // Lógica para mudar a cada dia
                      const now = new Date();
                      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
                      selectedQuote = quotes[dayOfYear % quotes.length];
                    }

                    return (
                      <>
                        <p 
                          className="text-sm font-normal leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: `"${selectedQuote.text}"` }}
                        />
                        <p className="text-sm font-bold mt-2">
                          <strong>{selectedQuote.reference}</strong>
                        </p>
                      </>
                    );
                  })()}
                </Card>
              </aside>
            </motion.div>
          )}

          {activeTab === 'courses' && (
            <motion.div 
              key="courses"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              {myCourses.map(course => (
                <div key={course.id} className="space-y-12">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                    <div className="flex-1">
                      <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-6">{course.title}</h2>
                    </div>
                    <Button 
                      variant="primary"
                      className="w-full md:w-auto px-12 py-8 text-xs font-black uppercase tracking-[0.2em]"
                      onClick={() => setViewingCourse(course)}
                    >
                      <Play className="w-4 h-4 mr-3 fill-current" />
                      Continuar Curso
                    </Button>
                  </div>
                </div>
              ))}
              {myCourses.length === 0 && (
                <div className="text-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">Você ainda não está matriculado em nenhum curso.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'practice' && (
            <motion.div 
              key="practice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full h-[800px] rounded-[3rem] overflow-hidden border border-slate-200 shadow-2xl"
            >
              <iframe 
                src="https://paginadeestudos.netlify.app" 
                className="w-full h-full border-none"
                title="Página de Estudos"
              />
            </motion.div>
          )}

          {activeTab === 'cronograma' && (
            <motion.div 
              key="cronograma"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Cronograma de Aulas</h3>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {mySchedules.map(sc => (
                  <Card key={sc.id} className={`p-6 border-2 transition-all ${sc.status === 'COMPLETED' ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-white'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2 rounded-lg ${sc.status === 'COMPLETED' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Calendar className="w-4 h-4" />
                      </div>
                      {sc.status === 'COMPLETED' ? (
                        <Badge variant="success">Finalizado</Badge>
                      ) : (
                        <Badge variant="warning">Pendente</Badge>
                      )}
                    </div>
                    <h4 className={`font-black uppercase text-sm tracking-tight mb-2 ${sc.status === 'COMPLETED' ? 'text-emerald-900' : 'text-slate-900'}`}>
                      {sc.title?.includes('[FALTA]') ? (
                        <>
                          <span className="text-red-600">[FALTA] </span>
                          {sc.title.replace('[FALTA]', '').trim()}
                        </>
                      ) : (
                        sc.title || 'Aula de Música'
                      )}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {formatDisplayDate(sc.date)} às {sc.time}
                    </p>
                  </Card>
                ))}
                {mySchedules.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-slate-50 rounded-4xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">Nenhuma aula agendada.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'payments' && (
            <motion.div 
              key="payments"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <Card className="p-12 text-center border-slate-200">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Total de Mensalidades</p>
                <h3 className="text-6xl font-black tracking-tighter text-slate-900">
                  R$ {myPayments.reduce((acc, p) => acc + p.amount, 0).toFixed(2)}
                </h3>
                <Badge variant={myPayments.some(p => p.status === 'PENDING') ? 'warning' : 'success'} className="mt-6">
                  {myPayments.some(p => p.status === 'PENDING') ? 'Pagamentos Pendentes' : 'Tudo em Dia'}
                </Badge>
              </Card>

              <div className="space-y-4">
                <h4 className="text-xl font-black uppercase tracking-tighter mb-6">Histórico de Pagamentos</h4>
                {myPayments.map(p => (
                  <Card key={p.id} className="flex justify-between items-center py-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-100 p-3 rounded-2xl">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-black text-sm uppercase">Mensalidade {getMonthName(p.dueDate)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Vencimento: {formatDisplayDate(p.dueDate)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg">R$ {p.amount.toFixed(2)}</p>
                      <Badge variant={p.status === 'PAID' ? 'success' : 'warning'}>{p.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'recitais' && (
            <motion.div 
              key="recitais"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Meus Recitais</h3>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>

              {(() => {
                const myRecitals = recitals.filter(r => myProfileIds.includes(r.studentId));
                const groupedByCourse = myRecitals.reduce((acc, r) => {
                  if (!acc[r.courseId]) acc[r.courseId] = [];
                  acc[r.courseId].push(r);
                  return acc;
                }, {} as Record<string, Recital[]>);

                if (myRecitals.length === 0) {
                  return (
                    <div className="text-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">Nenhum recital disponível para você ainda.</p>
                    </div>
                  );
                }

                return (Object.entries(groupedByCourse) as [string, Recital[]][]).map(([courseId, courseRecitals]) => {
                  const course = courses.find(c => c.id === courseId);
                  return (
                    <div key={courseId} className="space-y-6">
                      <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl inline-block">
                        <h4 className="text-sm font-black uppercase tracking-widest">{course?.title || 'Curso'}</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courseRecitals.map(r => (
                          <Card key={r.id} className={`p-8 border-2 transition-all ${r.completed ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-white'}`}>
                            <div className="flex justify-between items-start mb-6">
                              <div className={`p-3 rounded-2xl ${r.completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <Mic2 className="w-5 h-5" />
                              </div>
                              <input 
                                type="checkbox" 
                                checked={r.completed}
                                onChange={(e) => onUpdateRecital(r.id, e.target.checked)}
                                className="w-6 h-6 rounded-lg border-2 border-slate-200 text-red-600 focus:ring-red-600 cursor-pointer"
                              />
                            </div>
                            <h5 className={`font-black uppercase text-lg tracking-tighter mb-6 leading-tight ${r.completed ? 'text-emerald-900' : 'text-slate-900'}`}>
                              {r.hymnName}
                            </h5>
                            <Button 
                              variant={r.completed ? 'outline' : 'primary'}
                              className="w-full py-4 text-[10px] font-black uppercase tracking-widest"
                              onClick={() => setViewingRecitalVideo(r)}
                            >
                              <Play className="w-4 h-4 mr-2 fill-current" />
                              Ver Vídeo
                            </Button>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {isEditingProfile && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-4xl p-12 shadow-2xl relative"
          >
             <button 
               onClick={() => setIsEditingProfile(false)} 
               className="absolute top-8 right-8 text-slate-400 hover:text-red-600 transition-colors"
             >
               <Settings className="w-6 h-6" />
             </button>

             <h3 className="text-2xl font-black uppercase tracking-tighter mb-10">Meus Dados</h3>
             
             <form onSubmit={handleProfileSubmit} className="space-y-8">
               <div className="flex flex-col items-center">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                     <img 
                       src={profileForm.avatar || DEFAULT_AVATARS.male} 
                       className="w-32 h-32 rounded-full border-4 border-red-600 object-cover shadow-2xl transition-transform group-hover:scale-105" 
                       alt="Avatar"
                     />
                     <div className="absolute bottom-0 right-0 bg-slate-950 text-white p-2 rounded-full border-2 border-white shadow-lg">
                       <Settings className="w-4 h-4" />
                     </div>
                     <input 
                       type="file" 
                       ref={fileInputRef} 
                       onChange={handleFileUpload} 
                       className="hidden" 
                       accept="image/*" 
                     />
                  </div>
                  <div className="flex gap-2 mt-6 w-full">
                    <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setProfileForm({...profileForm, avatar: DEFAULT_AVATARS.male})}>Masculino</Button>
                    <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setProfileForm({...profileForm, avatar: DEFAULT_AVATARS.female})}>Feminino</Button>
                  </div>
               </div>

               <Input 
                 label="Seu Nome"
                 value={profileForm.name}
                 onChange={e => setProfileForm({...profileForm, name: e.target.value})}
               />

               <Input 
                 label="WhatsApp"
                 value={profileForm.whatsapp || ''}
                 onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})}
                 placeholder="(00) 00000-0000"
               />

               <Button type="submit" isLoading={isSaving} className="w-full py-6">
                 Confirmar Alterações
               </Button>
             </form>
          </motion.div>
        </div>
      )}

      {viewingRecitalVideo && (
        <div className="fixed inset-0 bg-slate-950/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl relative"
          >
            <div className="bg-slate-900 p-6 md:p-8 flex justify-between items-center text-white">
              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter">{viewingRecitalVideo.hymnName}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {courses.find(c => c.id === viewingRecitalVideo.courseId)?.title}
                </p>
              </div>
              <button 
                onClick={() => setViewingRecitalVideo(null)}
                className="p-3 bg-white/10 hover:bg-red-600 rounded-2xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="aspect-video bg-black">
              <iframe 
                src={getVideoEmbedUrl(viewingRecitalVideo.videoUrl)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="p-8 bg-slate-50 flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => setViewingRecitalVideo(null)}
                className="px-12"
              >
                Fechar Vídeo
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 py-6 px-2 border-b-4 transition-all whitespace-nowrap ${
      active ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-600'
    }`}
  >
    {icon}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default StudentDashboard;
