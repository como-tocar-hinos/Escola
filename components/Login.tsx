
import React, { useState } from 'react';
import { UserRole, Instrument, Level } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Music, LogIn, UserPlus, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

interface LoginProps {
  onLogin: (email: string, password: string, role: UserRole) => void;
  onRegister: (data: { email: string; password: string; name: string; instrument: Instrument; level: Level }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [instrument, setInstrument] = useState<Instrument>('Violão');
  const [level, setLevel] = useState<Level>('NZ');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [rememberMe, setRememberMe] = useState(false);

  React.useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Por favor, preencha todos os campos.");
    
    if (isRegistering) {
      if (!name) return alert("Por favor, preencha seu nome.");
      onRegister({ email, password, name, instrument, level });
    } else {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      onLogin(email, password, role);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 100, 0],
            y: [0, -100, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -left-20 w-96 h-96 bg-red-50 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, -45, 0],
            x: [0, -50, 0],
            y: [0, 100, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-20 -right-20 w-96 h-96 bg-slate-50 rounded-full blur-3xl" 
        />
      </div>

      <Card 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-0 overflow-hidden relative z-10 border-slate-100 shadow-2xl rounded-[3rem]"
      >
        <div className="p-10 bg-white text-center relative overflow-hidden border-b border-slate-50">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex justify-center mb-8"
          >
            <div className="bg-slate-950 p-5 rounded-[2rem] shadow-2xl shadow-slate-950/20">
              <Music className="w-10 h-10 text-red-600" />
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-black uppercase tracking-tighter leading-none"
          >
            Como <span className="text-red-600">Tocar</span> Hinos
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] leading-none"
          >
            {isRegistering ? 'Crie sua conta de aluno' : 'Toque Sacro de Forma Fácil'}
          </motion.p>
        </div>

        <div className="p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <AnimatePresence mode="wait">
              {!isRegistering ? (
                <motion.div 
                  key="login-role"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 ml-4 tracking-widest">Acessar como</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setRole('STUDENT')}
                        className={`py-4 text-[11px] font-black uppercase rounded-2xl border-2 transition-all tracking-widest ${
                          role === 'STUDENT' ? 'bg-slate-950 text-white border-slate-950 shadow-xl' : 'bg-white text-slate-400 border-slate-100'
                        }`}
                      >
                        Aluno
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('ADMIN')}
                        className={`py-4 text-[11px] font-black uppercase rounded-2xl border-2 transition-all tracking-widest ${
                          role === 'ADMIN' ? 'bg-red-600 text-white border-red-600 shadow-xl shadow-red-600/20' : 'bg-white text-slate-400 border-slate-100'
                        }`}
                      >
                        Admin
                      </button>
                    </div>
                  </div>

                  <Input 
                    label="E-mail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />

                  <Input 
                    label="Senha"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />

                  <div className="flex items-center gap-3 ml-4">
                    <input 
                      type="checkbox" 
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-5 h-5 accent-red-600 rounded-lg cursor-pointer"
                    />
                    <label htmlFor="rememberMe" className="text-[10px] font-black uppercase text-slate-400 cursor-pointer tracking-widest">
                      Lembrar meu e-mail
                    </label>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="register-fields"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <Input 
                    label="Nome Completo"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu Nome"
                  />

                  <Input 
                    label="E-mail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />

                  <Input 
                    label="Senha"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Instrumento</label>
                      <select
                        value={instrument}
                        onChange={(e) => setInstrument(e.target.value as Instrument)}
                        className="w-full px-5 py-4 border-2 border-slate-50 rounded-2xl font-bold text-xs bg-slate-50/50 outline-none focus:border-red-600 transition-all"
                      >
                        <option value="Violão">Violão</option>
                        <option value="Piano">Piano</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Nível</label>
                      <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value as Level)}
                        className="w-full px-5 py-4 border-2 border-slate-50 rounded-2xl font-bold text-xs bg-slate-50/50 outline-none focus:border-red-600 transition-all"
                      >
                        <option value="NZ">NZ</option>
                        <option value="N1">N1</option>
                        <option value="N2">N2</option>
                        <option value="N3">N3</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              className="w-full py-8 text-xs font-black uppercase tracking-[0.2em] shadow-2xl"
            >
              {isRegistering ? (
                <>
                  <UserPlus className="w-4 h-4 mr-3" />
                  Finalizar Cadastro
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-3" />
                  Entrar no Sistema
                </>
              )}
            </Button>
          </form>

          <div className="mt-10 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="group text-[10px] font-black uppercase text-slate-400 hover:text-red-600 transition-colors tracking-widest flex items-center justify-center mx-auto"
            >
              {isRegistering ? 'Já tenho uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
              <ChevronRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </Card>
    </div>

  );
};

export default Login;
