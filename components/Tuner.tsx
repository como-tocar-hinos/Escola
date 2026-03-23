
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const Tuner: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [note, setNote] = useState('--');
  const [cents, setCents] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  // Busca dispositivos de áudio disponíveis
  const getDevices = async () => {
    try {
      // Solicita permissão básica primeiro para que os nomes dos dispositivos apareçam
      const initialStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      initialStream.getTracks().forEach(track => track.stop());

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.error("Erro ao listar dispositivos:", err);
      setError("Permissão de áudio necessária para listar interfaces.");
    }
  };

  const startTuner = async () => {
    try {
      const constraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.current = mediaStream;
      
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser.current = audioCtx.current.createAnalyser();
      analyser.current.fftSize = 2048;

      const source = audioCtx.current.createMediaStreamSource(mediaStream);
      source.connect(analyser.current);

      setIsActive(true);
      setError(null);
      updatePitch();
    } catch (err) {
      setError('Erro ao acessar a interface selecionada.');
      console.error(err);
    }
  };

  const stopTuner = () => {
    setIsActive(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (stream.current) {
      stream.current.getTracks().forEach(track => track.stop());
    }
    if (audioCtx.current) {
      audioCtx.current.close();
    }
    setNote('--');
    setCents(0);
  };

  const updatePitch = () => {
    if (!analyser.current) return;
    
    const bufferLength = analyser.current.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyser.current.getFloatTimeDomainData(buffer);

    const pitch = autoCorrelate(buffer, audioCtx.current!.sampleRate);

    if (pitch !== -1) {
      const noteNum = 12 * (Math.log(pitch / 440) / Math.log(2));
      const roundedNote = Math.round(noteNum) + 69;
      const frequencyFromNote = 440 * Math.pow(2, (roundedNote - 69) / 12);
      const diffCents = Math.floor(1200 * (Math.log(pitch / frequencyFromNote) / Math.log(2)));
      
      setNote(NOTES[roundedNote % 12]);
      setCents(diffCents);
    }

    animationRef.current = requestAnimationFrame(updatePitch);
  };

  const autoCorrelate = (buffer: Float32Array, sampleRate: number) => {
    let size = buffer.length;
    let rms = 0;

    for (let i = 0; i < size; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / size);
    if (rms < 0.01) return -1;

    let r1 = 0, r2 = size - 1, thres = 0.2;
    for (let i = 0; i < size / 2; i++) {
      if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < size / 2; i++) {
      if (Math.abs(buffer[size - i]) < thres) { r2 = size - i; break; }
    }

    const buf = buffer.slice(r1, r2);
    size = buf.length;

    const c = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size - i; j++) {
        c[i] = c[i] + buf[j] * buf[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < size; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;
    return sampleRate / T0;
  };

  useEffect(() => {
    getDevices();
    return () => stopTuner();
  }, []);

  const isTuned = Math.abs(cents) < 5;

  return (
    <Card variant="dark" className="p-8 md:p-10 border-white/5 shadow-2xl flex flex-col justify-between min-h-[320px] relative overflow-hidden">
      {/* Background Visualizer Effect */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-end justify-around pointer-events-none px-4 pb-20"
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  height: [20, Math.random() * 100 + 20, 20],
                }}
                transition={{ 
                  duration: 0.5 + Math.random(), 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-1 bg-red-600 rounded-full"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-600/20">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Afinador Digital</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[8px] font-black uppercase ${isActive ? 'text-green-500' : 'text-slate-500'}`}>
              {isActive ? 'Ativo' : 'Inativo'}
            </span>
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-slate-700'}`} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase text-slate-500 ml-2 tracking-widest">Interface de Áudio</label>
          <select 
            disabled={isActive}
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full bg-white/5 border-2 border-white/5 rounded-2xl p-4 text-[10px] font-bold uppercase text-white outline-none focus:border-red-600 transition-all disabled:opacity-50 appearance-none cursor-pointer"
          >
            {devices.length === 0 && <option value="" className="bg-slate-900">Buscando interfaces...</option>}
            {devices.map(device => (
              <option key={device.deviceId} value={device.deviceId} className="bg-slate-900">
                {device.label || `Interface ${device.deviceId.slice(0, 5)}...`}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-6 text-red-500 gap-2">
            <AlertCircle className="w-8 h-8" />
            <p className="text-[10px] font-black uppercase tracking-widest text-center">{error}</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <motion.div 
              animate={isActive ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.2 }}
              className="text-7xl font-black tracking-tighter leading-none text-white"
            >
              {note}
            </motion.div>
            <div className="mt-4 flex flex-col items-center gap-4">
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full ${
                isActive 
                  ? isTuned ? 'bg-green-500/20 text-green-500' : 'bg-red-600/20 text-red-600'
                  : 'bg-white/5 text-slate-500'
              }`}>
                {isActive ? (isTuned ? 'Afinado' : cents > 0 ? 'Muito Alto' : 'Muito Baixo') : 'Pronto'}
              </div>

              {/* Tuning Meter */}
              <div className="w-full max-w-[200px] relative h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ left: `${50 + (cents / 50) * 50}%` }}
                  className={`absolute top-0 bottom-0 w-1.5 rounded-full shadow-lg transition-colors ${isTuned ? 'bg-green-500 shadow-green-500/50' : 'bg-red-600 shadow-red-600/50'}`}
                />
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-white/20" />
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={isActive ? stopTuner : startTuner}
          variant={isActive ? "outline" : "primary"}
          className={`w-full py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            isActive ? 'border-white/20 text-white hover:bg-white/5' : ''
          }`}
        >
          {isActive ? (
            <>
              <MicOff className="w-4 h-4 mr-2" />
              Desligar Afinador
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 mr-2" />
              Iniciar Afinação
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default Tuner;
