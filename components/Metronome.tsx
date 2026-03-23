
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Music } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const Metronome: React.FC = () => {
  const [bpm, setBpm] = useState(60);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  // Função interna para tocar o som
  const playClick = () => {
    if (!audioCtx.current || audioCtx.current.state === 'suspended') return;
    
    const osc = audioCtx.current.createOscillator();
    const envelope = audioCtx.current.createGain();

    osc.frequency.value = 880;
    envelope.gain.value = 1;
    envelope.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + 0.1);

    osc.connect(envelope);
    envelope.connect(audioCtx.current.destination);

    osc.start();
    osc.stop(audioCtx.current.currentTime + 0.1);
  };

  const toggleMetronome = () => {
    // 1. Inicializa ou recupera o contexto imediatamente no clique
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // 2. Chama o resume imediatamente (sem await anterior) para satisfazer o Safari/iOS
    const resumePromise = audioCtx.current.state === 'suspended' 
      ? audioCtx.current.resume() 
      : Promise.resolve();

    resumePromise.then(() => {
      if (playing) {
        if (timer.current) clearInterval(timer.current);
        setPlaying(false);
      } else {
        // Toca o primeiro som imediatamente para confirmar a ativação
        playClick();
        
        const interval = (60 / bpm) * 1000;
        if (timer.current) clearInterval(timer.current);
        timer.current = window.setInterval(playClick, interval);
        setPlaying(true);
      }
    }).catch(err => {
      console.error("Erro ao ativar áudio no iOS:", err);
    });
  };

  // Efeito para atualizar o tempo se o BPM mudar enquanto toca
  useEffect(() => {
    if (playing) {
      if (timer.current) clearInterval(timer.current);
      const interval = (60 / bpm) * 1000;
      timer.current = window.setInterval(playClick, interval);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [bpm, playing]);

  return (
    <Card variant="dark" className="p-8 md:p-10 border-white/5 shadow-2xl relative overflow-hidden">
      {/* Background Pulse Effect */}
      <AnimatePresence>
        {playing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0.1, 0.3, 0.1],
              scale: [1, 1.2, 1]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 60 / bpm, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-red-600/20 rounded-full blur-3xl pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-600/20">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Metrônomo</span>
          </div>
          <div className="text-3xl font-black text-white tracking-tighter">
            {bpm} <span className="text-red-600 text-sm">BPM</span>
          </div>
        </div>

        <div className="space-y-8">
          <div className="relative h-12 flex items-center">
            <input 
              type="range" 
              min="40" 
              max="220" 
              value={bpm} 
              onChange={(e) => setBpm(parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            {/* Tick marks */}
            <div className="absolute inset-0 flex justify-between items-center pointer-events-none px-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-0.5 h-3 bg-white/20 rounded-full" />
              ))}
            </div>
          </div>

          <Button 
            onClick={toggleMetronome}
            variant={playing ? "outline" : "primary"}
            className={`w-full py-8 text-xs font-black uppercase tracking-[0.3em] transition-all ${
              playing ? 'border-white/20 text-white hover:bg-white/5' : ''
            }`}
          >
            {playing ? (
              <>
                <Square className="w-4 h-4 mr-3 fill-current" />
                Parar
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-3 fill-current" />
                Iniciar
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default Metronome;
