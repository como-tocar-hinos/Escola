
import React, { useState, useMemo } from 'react';
import { Course, Lesson, Material } from '../types';
import Metronome from './Metronome';
import Tuner from './Tuner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  FileText, 
  Music, 
  Video, 
  Layout, 
  Download,
  ArrowLeft,
  Clock
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface CoursePlayerProps {
  course: Course;
  onBack: () => void;
  materials: Material[];
}

const CoursePlayer: React.FC<CoursePlayerProps> = ({ course, onBack, materials }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'aulas' | 'materiais'>('aulas');

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
  const [videoType, setVideoType] = useState<'arranjo' | 'aovivo'>('arranjo');

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/embed/')) return url;
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else {
      videoId = url; // Assume que é o ID direto
    }
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
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

  const videoUrl = getYouTubeEmbedUrl(videoType === 'arranjo' ? selectedLesson.videoArranjoUrl : selectedLesson.videoAoVivoUrl);
  const courseMaterials = materials.filter(m => m.instrument === course.instrument && m.level === course.level);

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

        <div className="flex bg-slate-200 p-1 rounded-xl mb-8">
          <button 
            onClick={() => setActiveTab('aulas')} 
            className={`flex-1 py-2.5 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === 'aulas' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}
          >
            AULAS
          </button>
          <button 
            onClick={() => setActiveTab('materiais')} 
            className={`flex-1 py-2.5 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === 'materiais' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}
          >
            ARQUIVOS
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-8">
        {activeTab === 'aulas' ? (
          course.modules?.map((module, mIdx) => (
            <div key={module.id || mIdx} className="mb-6">
              <div className="px-4 py-2 text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 border-b border-slate-200">
                {module.title}
              </div>
              <div className="space-y-1">
                {module.lessons?.map((lesson, lIdx) => (
                  <button
                    key={lesson.id || lIdx}
                    onClick={() => { setSelectedLesson(lesson); setIsSidebarOpen(false); }}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all flex items-center space-x-4 ${
                      selectedLesson.id === lesson.id 
                        ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' 
                        : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border shrink-0 ${
                      selectedLesson.id === lesson.id ? 'border-white/30 bg-white/10' : 'border-slate-300 bg-white text-slate-400'
                    }`}>
                      {lIdx + 1}
                    </div>
                    <span className="text-[10px] font-black uppercase flex-1 leading-tight">{lesson.title}</span>
                    {selectedLesson.id === lesson.id && <Play className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 space-y-3">
            {courseMaterials.length > 0 ? (
              courseMaterials.map(m => (
                <a 
                  key={m.id} 
                  href={m.fileUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center p-4 bg-white border border-slate-100 rounded-2xl hover:border-red-600 transition-all shadow-sm group"
                >
                  <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-red-50 transition-colors">
                    <FileText className="w-5 h-5 text-slate-600 group-hover:text-red-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <span className="text-[9px] font-black uppercase block">{m.title}</span>
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Download PDF</span>
                  </div>
                  <Download className="w-4 h-4 text-slate-300 group-hover:text-red-600" />
                </a>
              ))
            ) : (
              <div className="text-center py-12 opacity-50">
                <p className="text-[9px] font-black uppercase">Nenhum arquivo disponível</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden relative">
      <header className="bg-slate-950 text-white h-16 flex items-center px-4 md:px-8 shrink-0 z-50 border-b border-white/5">
        <div className="flex-1 flex items-center gap-3">
           <div className="bg-red-600 p-1.5 rounded-lg">
             <Music className="w-5 h-5" />
           </div>
           <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter">AULA ONLINE</h1>
        </div>
        <Button variant="primary" size="sm" onClick={onBack} className="shadow-lg shadow-red-600/30">
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
          {/* Mobile Tab de Aulas */}
          <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 py-3 flex justify-between items-center border-b border-slate-100">
             <Button variant="neo" size="sm" onClick={() => setIsSidebarOpen(true)}>
               <Layout className="w-4 h-4 mr-2" />
               VER AULAS
             </Button>
             <span className="text-[10px] font-black uppercase text-slate-400 truncate ml-4 max-w-[150px]">{selectedLesson.title}</span>
          </div>

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

              {/* Títulos e Controles de Versão */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-100">
                 <div className="flex p-1 bg-slate-200 rounded-2xl w-full md:w-auto">
                   <button 
                    onClick={() => setVideoType('arranjo')} 
                    className={`flex-1 md:px-10 py-3.5 rounded-xl text-[10px] font-black uppercase transition-all ${videoType === 'arranjo' ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     ARRANJO
                   </button>
                   <button 
                    onClick={() => setVideoType('aovivo')} 
                    className={`flex-1 md:px-10 py-3.5 rounded-xl text-[10px] font-black uppercase transition-all ${videoType === 'aovivo' ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     AULA AO VIVO
                   </button>
                 </div>
                 
                 <div className="text-center md:text-right w-full md:w-auto">
                   <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter leading-none">{selectedLesson.title}</h2>
                   <div className="flex items-center justify-center md:justify-end gap-2 mt-2">
                     <Badge variant="outline">{course.instrument}</Badge>
                     <Badge variant="outline">{course.level}</Badge>
                   </div>
                 </div>
              </div>
            </motion.div>

            {/* Colunas: Descrição e Ferramentas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
              <div className="lg:col-span-2 space-y-8">
                <Card className="p-8 md:p-12">
                   <h3 className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] mb-8 border-b border-slate-100 pb-4 flex items-center gap-2">
                     <FileText className="w-4 h-4" />
                     DESCRIÇÃO DA AULA
                   </h3>
                   <p className="text-sm md:text-base text-slate-600 leading-relaxed font-medium">
                     {selectedLesson.description || "Toque Sacro de Forma Fácil - Estudo técnico e prático para louvor."}
                   </p>
                </Card>

                {/* Mobile Tools (Visible only on small screens) */}
                <div className="lg:hidden space-y-8">
                  <ToolSection title="Metrônomo" icon={<Clock className="w-5 h-5" />}><Metronome /></ToolSection>
                  <ToolSection title="Afinador" icon={<Music className="w-5 h-5" />}><Tuner /></ToolSection>
                </div>
              </div>

              {/* Desktop Tools */}
              <div className="hidden lg:block space-y-8">
                <ToolSection title="Metrônomo" icon={<Clock className="w-5 h-5" />}><Metronome /></ToolSection>
                <ToolSection title="Afinador" icon={<Music className="w-5 h-5" />}><Tuner /></ToolSection>
              </div>
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
