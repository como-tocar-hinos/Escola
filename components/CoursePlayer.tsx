
import React, { useState, useMemo, useEffect } from 'react';
import { Course, Lesson, LessonDB, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  FileText, 
  Music, 
  Video, 
  Layout, 
  Download,
  ArrowLeft,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface CoursePlayerProps {
  course: Course;
  onBack: () => void;
  user: User;
}

const CoursePlayer: React.FC<CoursePlayerProps> = ({ course, onBack, user }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const firstLesson = useMemo(() => {
    if (course.modules && course.modules.length > 0) {
      for (const module of course.modules) {
        if (module.lessons && module.lessons.length > 0) {
          return module.lessons[0];
        }
      }
    }
    return null;
  }, [course]);

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(firstLesson);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (firstLesson && !selectedLesson) {
      setSelectedLesson(firstLesson);
      // Expand the first module by default
      if (course.modules && course.modules.length > 0) {
        setExpandedModules({ [course.modules[0].id || '0']: true });
      }
    }
  }, [firstLesson, selectedLesson, course.modules]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  useEffect(() => {
    if (firstLesson) {
      setSelectedLesson(firstLesson);
    }
  }, [course.id, firstLesson]);

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // Handle already embed URLs
    if (url.includes('youtube.com/embed/')) return url;

    // Comprehensive regex for YouTube URLs
    // Handles: watch?v=, youtu.be/, v/, vi/, u/w/embed/, shorts/, live/
    const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/|live\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    const match = url.match(regExp);

    if (match && match[1]) {
      const videoId = match[1];
      // Ensure videoId is the correct length (usually 11 characters)
      if (videoId.length === 11) {
        return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
      }
    }
    
    // If it's just an 11-character string, assume it's the ID
    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 11 && !trimmedUrl.includes('/') && !trimmedUrl.includes('.')) {
      return `https://www.youtube.com/embed/${trimmedUrl}?rel=0&modestbranding=1`;
    }

    return '';
  };

  if (!selectedLesson) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-slate-50 p-8 text-center">
        <Card className="p-12 max-w-md flex flex-col items-center">
          <span className="text-6xl mb-6 block">🚧</span>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Curso em Construção</h2>
          <p className="text-slate-500 text-sm mb-8">Estamos preparando o melhor conteúdo para você. Volte em breve!</p>
          <Button onClick={onBack} variant="primary" className="w-full">Voltar ao Início</Button>
        </Card>
      </div>
    );
  }

  const videoUrl = getYouTubeEmbedUrl(selectedLesson.videoArranjoUrl);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack} 
          className="text-[9px] font-black uppercase text-slate-400 hover:text-red-600 mb-6 tracking-widest w-full justify-start"
        >
          <ArrowLeft className="w-3 h-3 mr-2" />
          VOLTAR PARA INÍCIO
        </Button>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-slate-950 text-white p-2.5 rounded-xl shadow-lg">
             <Music className="w-6 h-6" />
          </div>
          <h2 className="font-black text-lg uppercase tracking-tight leading-tight">{course.instrument} {course.level}</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-8">
        <div className="space-y-4 px-2">
          {course.modules?.map((module, mIdx) => {
            const moduleId = module.id || String(mIdx);
            const isExpanded = expandedModules[moduleId];
            
            return (
              <div key={moduleId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleModule(moduleId)}
                  className="w-full px-6 py-5 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-red-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg shadow-red-600/20">
                      {mIdx + 1}
                    </div>
                    <h4 className="font-black uppercase tracking-tighter text-sm text-slate-900">{module.title}</h4>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-2 space-y-1">
                        {module.lessons?.map((lesson, lIdx) => (
                          <button
                            key={lesson.id || lIdx}
                            onClick={() => { setSelectedLesson(lesson); setIsSidebarOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center space-x-4 ${
                              selectedLesson?.id === lesson.id 
                                ? 'bg-slate-950 text-white shadow-lg' 
                                : 'hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black border shrink-0 ${
                              selectedLesson?.id === lesson.id ? 'border-white/30 bg-white/10' : 'border-slate-200 bg-white text-slate-400'
                            }`}>
                              {lIdx + 1}
                            </div>
                            <span className="text-[9px] font-bold uppercase flex-1 leading-tight">{lesson.title}</span>
                            {selectedLesson?.id === lesson.id && <Play className="w-2.5 h-2.5" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden relative">
      <header className="bg-slate-950 text-white h-16 flex items-center px-4 md:px-8 shrink-0 z-50 border-b border-white/5 sticky top-0">
        <div className="flex-1 flex items-center gap-3">
           <Button variant="neo" size="sm" className="lg:hidden bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setIsSidebarOpen(true)}>
             <Layout className="w-4 h-4" />
           </Button>
           <div className="bg-red-600 p-1.5 rounded-lg hidden sm:block">
             <Music className="w-5 h-5" />
           </div>
           <h1 className="text-lg md:text-2xl font-black uppercase tracking-tighter truncate max-w-[150px] sm:max-w-none">
             {selectedLesson.title}
           </h1>
        </div>
        <Button variant="primary" size="sm" onClick={onBack} className="shadow-lg shadow-red-600/30 text-[10px] px-4">
          VOLTAR AO PAINEL
        </Button>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:block w-80 border-r border-slate-100 shrink-0">
          <SidebarContent />
        </aside>

        {/* Sidebar Mobile */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[300] lg:hidden" 
              onClick={() => setIsSidebarOpen(false)}
            >
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-80 h-full bg-white shadow-2xl" 
                onClick={e => e.stopPropagation()}
              >
                <SidebarContent />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Área Principal */}
        <main className="flex-1 bg-white overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-8 md:space-y-12 pb-20">
            {/* Player Container */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="aspect-video bg-slate-950 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl border-8 border-slate-100 ring-1 ring-slate-200 relative group">
                {videoUrl ? (
                  <iframe 
                    className="w-full h-full" 
                    src={videoUrl} 
                    title={selectedLesson.title} 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                    <Video className="w-12 h-12 opacity-20" />
                    <span className="font-black uppercase text-[10px] tracking-widest">Aguardando vídeo...</span>
                  </div>
                )}
              </div>

              {/* Títulos */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-100">
                 <div className="text-center md:text-left w-full">
                   <h2 className="text-xl md:text-4xl font-black uppercase tracking-tighter leading-none">{selectedLesson.title}</h2>
                   <div className="flex items-center justify-center md:justify-start gap-2 mt-4">
                     <Badge variant="error">{course.instrument}</Badge>
                     <Badge variant="outline" className="border-slate-200">{course.level}</Badge>
                   </div>
                 </div>
              </div>
            </motion.div>

            {/* Colunas: Descrição */}
            <div className="max-w-4xl mx-auto">
              <Card className="p-8 md:p-12">
                 <h3 className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] mb-8 border-b border-slate-100 pb-4 flex items-center gap-2">
                   <FileText className="w-4 h-4" />
                   DESCRIÇÃO DA AULA
                 </h3>
                 <p className="text-sm md:text-base text-slate-600 leading-relaxed font-medium">
                   {selectedLesson.description || "Toque Sacro de Forma Fácil - Estudo técnico e prático para louvor."}
                 </p>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const ToolSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3 px-4">
      <div className="text-red-600">{icon}</div>
      <h3 className="text-sm font-black uppercase tracking-tighter">{title}</h3>
    </div>
    {children}
  </div>
);

export default CoursePlayer;
