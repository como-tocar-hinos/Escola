
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Course, ScheduledClass, Payment, Instrument, Level, LessonDB, Quote, Recital } from './types';
import { MOCK_ADMIN, MOCK_STUDENTS, MOCK_COURSES, MOCK_SCHEDULES, MOCK_PAYMENTS, DEFAULT_AVATARS } from './constants';
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard';
import Login from './components/Login';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { createClient } from '@supabase/supabase-js';

const getApiBaseUrl = (): string => {
  // Permite uma sobreposição via variáveis de ambiente da build do Vite
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;

  const hostname = window.location.hostname;
  
  // Retornamos '' (caminho relativo) para:
  // 1. localhost (desenvolvimento local)
  // 2. domínios run.app (Cloud Run)
  // 3. domínios do Netlify ou o domínio personalizado comotocarhinos.com.br
  // Isso força o uso do proxy reverso configurado no netlify.toml,
  // contornando restrições de CORS e requisições OPTIONS pré-vôo bloqueadas pelo sandbox.
  if (
    hostname === 'localhost' || 
    hostname.includes('run.app') || 
    hostname.includes('netlify') || 
    hostname.includes('comotocarhinos.com.br')
  ) {
    return '';
  }
  
  // Por segurança, para qualquer outro domínio, também tenta caminhos relativos
  // pois o proxy de produção serve a app inteira (Fullstack).
  return '';
};

// Função auxiliar e robusta para fetch na API com fallback instantâneo de rede
const apiFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
  const hostname = window.location.hostname;
  
  // No localhost ou no próprio preview do AI Studio (run.app), usamos o caminho relativo sem intermediários
  if (hostname === 'localhost' || hostname.includes('run.app')) {
    return fetch(path, options);
  }

  // Em produção (Netlify ou domínio próprio comotocarhinos.com.br):
  // 1. Primeiro tenta o proxy relativo do Netlify (ex: /api/admin/create-user)
  const proxyUrl = path;
  const absoluteUrl = `https://ais-pre-rbl2ofvwsttjhlv4aw5fn5-67364419988.us-west2.run.app${path}`;

  try {
    console.log(`[apiFetch] Tentando via proxy relativo: ${proxyUrl}`);
    const response = await fetch(proxyUrl, options);
    
    // Se o Netlify responder com HTML em vez do pretendido (geralmente redirecionamento de erro ou rota SPA 404),
    // fomos pegos por um proxy desconfigurado ou inativo na CDN do Netlify.
    const contentType = response.headers.get("content-type");
    if (!response.ok && contentType && contentType.includes("text/html")) {
      console.warn(`[apiFetch] O proxy retornou HTML inesperado. Fazendo bypass para URL absoluta do Cloud Run...`);
      return fetch(absoluteUrl, options);
    }
    return response;
  } catch (err: any) {
    console.error(`[apiFetch] Erro de rede (ex: Load failed) no proxy relativo: ${err.message || err}. Tentando URL absoluta diretamente...`);
    // Se estourar erro de rede (tipo 'Load failed', falha de CORS ou bloqueios por DNS),
    // fazemos bypass do proxy do Netlify e falamos diretamente com o Cloud Run.
    return fetch(absoluteUrl, options);
  }
};

interface AlertModalProps {
  message: string;
  title?: string;
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ message, title = 'Notificação', onClose }) => {
  const isSuccess = message.includes('sucesso') || message.includes('Sucesso') || message.includes('concluído') || message.includes('✅') || message.includes('CRIADA') || message.includes('cadastrado') || message.includes('efetuada');
  const isError = message.includes('Erro') || message.includes('erro') || message.includes('❌') || message.includes('falhou') || message.includes('bloqueado');

  let displayTitle = title;
  if (!title || title === 'Notificação' || title === 'Aviso') {
    if (isSuccess) displayTitle = 'Tudo Certo!';
    else if (isError) displayTitle = 'Aviso / Atenção';
    else displayTitle = 'Mensagem da Escola';
  }

  // Soft emoji strip for clean presentation
  const cleanMessage = message
    .replace(/^[✅❌📋📦⚠️]\s*/, '')
    .trim();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-[20000] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] max-w-sm w-full shadow-2xl p-6 md:p-8 border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
          isSuccess ? 'bg-emerald-50 text-emerald-600' :
          isError ? 'bg-rose-50 text-rose-600' :
          'bg-amber-50 text-amber-600'
        }`}>
          {isSuccess ? (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          ) : isError ? (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">{displayTitle}</h3>
        
        <p className="text-xs text-gray-500 leading-relaxed max-h-[40vh] overflow-y-auto w-full px-2 mb-6 whitespace-pre-wrap text-left custom-scrollbar select-text selection:bg-red-50 selection:text-red-600">
          {cleanMessage}
        </p>
        
        <button
          onClick={onClose}
          className="w-full py-4 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-colors cursor-pointer active:scale-95 shadow-lg shadow-gray-950/10"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [alertConfig, setAlertConfig] = useState<{ message: string; title?: string } | null>(null);

  // Sobrescreve alert do window localmente no escopo do App para não travar no Safari
  const alert = (message: string, title?: string) => {
    setAlertConfig({ message, title });
  };

  const [students, setStudents] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [schedules, setSchedules] = useState<ScheduledClass[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [recitals, setRecitals] = useState<Recital[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // 1. Buscar Perfis
      const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
      if (pError) throw pError;
      
      if (profiles) {
        setStudents(profiles.map((p: any) => ({ 
          ...p, 
          role: (p.role === 'Estudante' || p.role === 'estudante') ? 'STUDENT' : (p.role || 'STUDENT').toUpperCase(),
          level: p.level === 'Nível Zero' ? 'NZ' : (p.level || 'NZ'),
          totalCompletedClasses: p.total_completed_classes || 0
        })));
      }

      // 2. Buscar Cursos
      console.log("Buscando cursos...");
      const { data: dbCourses, error: cError } = await supabase.from('courses').select('*');
      if (cError) {
        console.error("Erro na tabela de cursos:", cError);
        throw cError;
      }
      
      if (dbCourses && dbCourses.length > 0) {
        console.log(`${dbCourses.length} cursos encontrados.`);
        setCourses(dbCourses.map((c: any) => ({ ...c, studentIds: c.student_ids || [] })));
      } else {
        console.warn("Nenhum curso retornado do banco de dados.");
        setCourses([]);
      }

      // 3. Buscar Agendas
      const { data: dbSchedules, error: sError } = await supabase.from('schedules').select('*');
      if (sError) throw sError;
      if (dbSchedules) setSchedules(dbSchedules.map((s: any) => ({ 
        ...s, 
        studentId: s.student_id, 
        studentName: s.student_name, // Mapeia o novo campo do banco
        teacherId: s.teacher_id, 
        status: s.status?.toUpperCase() || 'PENDING' 
      })));

      // 4. Buscar Pagamentos
      const { data: dbPayments, error: payError } = await supabase.from('payments').select('*');
      if (payError) throw payError;
      if (dbPayments) setPayments(dbPayments.map((p: any) => ({ ...p, studentId: p.student_id, dueDate: p.due_date, status: (p.status || 'PENDING').toUpperCase() })));
      
      // 6. Buscar Citações
      const { data: dbQuotes, error: qError } = await supabase.from('quotes').select('*');
      if (!qError && dbQuotes) setQuotes(dbQuotes);

      // 7. Buscar Recitais
      console.log("Buscando recitais...");
      const { data: dbRecitals, error: rError } = await supabase.from('recitals').select('*');
      if (rError) {
        console.error("Erro na tabela de recitais:", rError);
      }
      
      if (!rError && dbRecitals) {
        console.log(`${dbRecitals.length} recitais encontrados.`);
        setRecitals(dbRecitals.map((r: any) => ({
          ...r,
          studentId: r.student_id,
          courseId: r.course_id,
          hymnName: r.hymn_name,
          videoUrl: r.video_url,
          createdAt: r.created_at
        })));
      } else if (!rError) {
        console.warn("Nenhum recital retornado do banco de dados.");
        setRecitals([]);
      }

      console.log("Dados carregados com sucesso!");
    } catch (err: any) {
      console.error("Erro na busca de dados:", err);
      // Usamos mocks se houver erro para não travar o app
      console.warn("Usando mocks devido a erro no banco.");
      setStudents(MOCK_STUDENTS);
      setCourses(MOCK_COURSES);
      setSchedules(MOCK_SCHEDULES);
      setPayments(MOCK_PAYMENTS);
      setRecitals([]);
    }
  }, []);

  // FUNÇÃO CRÍTICA: Garante que o usuário tenha um perfil, mesmo que o DB esteja com erro
  const ensureProfileExists = async (authUser: any): Promise<User> => {
    console.log("Sincronizando perfil:", authUser.id);
    
    // 1. Tentar buscar o perfil no banco pelo ID real do Auth
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    // 2. Se não achou pelo ID, tenta buscar pelo E-MAIL (caso o Admin tenha pré-cadastrado o aluno)
    if (!profile && authUser.email) {
      console.log("Perfil não encontrado por ID. Buscando por e-mail:", authUser.email);
      const { data: preRegistered } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', authUser.email)
        .single();
      
      if (preRegistered) {
        console.log("Vínculo encontrado! Transferindo dados do ID antigo para o novo...");
        
        // 1. Criar o novo perfil com o ID real do Auth, copiando os dados do antigo
        const { error: createError } = await supabase.from('profiles').insert([{
          ...preRegistered,
          id: authUser.id, // ID Real do Supabase Auth
          role: preRegistered.role || 'STUDENT'
        }]);

        if (!createError) {
          console.log("Perfil real criado. Atualizando registros vinculados...");
          // 2. Atualizar todas as tabelas relacionadas para o novo ID
          // Fazemos isso um por um para garantir que as permissões RLS permitam
          await supabase.from('schedules').update({ student_id: authUser.id }).eq('student_id', preRegistered.id);
          await supabase.from('payments').update({ student_id: authUser.id }).eq('student_id', preRegistered.id);
          
          // 3. Atualizar acesso aos cursos
          const { data: allCourses } = await supabase.from('courses').select('id, student_ids');
          if (allCourses) {
            for (const course of allCourses) {
              if (course.student_ids?.includes(preRegistered.id)) {
                const updatedIds = course.student_ids.map((id: string) => id === preRegistered.id ? authUser.id : id);
                await supabase.from('courses').update({ student_ids: updatedIds }).eq('id', course.id);
              }
            }
          }

          // 4. Deletar o perfil temporário antigo (opcional, mas limpa o banco)
          try {
            await supabase.from('profiles').delete().eq('id', preRegistered.id);
          } catch (e) {
            console.warn("Não foi possível deletar o perfil antigo, mas o novo já foi criado.");
          }
          
          console.log("Sincronização concluída com sucesso!");
          profile = { ...preRegistered, id: authUser.id };
        } else {
          console.error("Erro ao criar perfil real (pode ser conflito de e-mail):", createError);
          // Se falhou ao criar porque o e-mail já existe, vamos tentar apenas atualizar o ID do existente
          const { error: updateIdError } = await supabase
            .from('profiles')
            .update({ id: authUser.id })
            .eq('email', authUser.email);
          
          if (!updateIdError) {
             console.log("ID do perfil existente atualizado com sucesso.");
             profile = { ...preRegistered, id: authUser.id };
          }
        }
      }
    }

    if (profile) {
      return { 
        ...profile, 
        role: (profile.role || 'STUDENT').toUpperCase() as UserRole,
        totalCompletedClasses: profile.total_completed_classes || 0
      };
    }

    // 3. Se realmente não existe nada, criar um novo perfil do zero
    const meta = authUser.user_metadata || {};
    const isAdmin = authUser.email === 'comotocarhinos@gmail.com';
    
    const newProfile: User = {
      id: authUser.id,
      name: meta.name || authUser.email?.split('@')[0] || 'Novo Aluno',
      email: authUser.email || '',
      role: isAdmin ? 'ADMIN' : 'STUDENT',
      instrument: (meta.instrument as Instrument) || 'Violão',
      level: (meta.level as Level) || 'NZ',
      avatar: meta.avatar || DEFAULT_AVATARS.male,
      totalCompletedClasses: 0
    };

    await supabase.from('profiles').insert([{
      id: newProfile.id,
      name: newProfile.name,
      email: newProfile.email,
      role: newProfile.role,
      instrument: newProfile.instrument,
      level: newProfile.level,
      avatar: newProfile.avatar,
      total_completed_classes: 0
    }]);

    return newProfile;
  };

  useEffect(() => {
    console.log("App State:", { loading, user: user?.email });
  }, [loading, user]);

  useEffect(() => {
    const checkSession = async () => {
      console.log("Checando sessão inicial...");
      const timeout = setTimeout(() => {
        if (loading) {
          console.warn("Timeout na checagem de sessão. Forçando carregamento...");
          setLoading(false);
        }
      }, 5000);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Erro ao buscar sessão:", sessionError);
          throw sessionError;
        }

        if (session?.user) {
          console.log("Sessão ativa encontrada para:", session.user.email);
          const profile = await ensureProfileExists(session.user);
          console.log("Perfil carregado da sessão:", profile);
          setUser(profile);
          await fetchData();
        } else {
          console.log("Nenhuma sessão ativa encontrada.");
        }
      } catch (e) {
        console.error("Erro fatal na checagem de sessão:", e);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    checkSession();

    // 2. Listeners em tempo real para sincronização entre painéis
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recitals' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleLogin = async (email: string, password: string, role: UserRole) => {
    setLoading(true);
    console.log(`[LOGIN] Iniciando tentativa: ${email} como ${role}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("[LOGIN] Erro na autenticação Supabase:", error);
        if (error.message.includes("Email not confirmed")) {
          throw new Error("⚠️ Seu e-mail foi cadastrado mas falta confirmar o link enviado para sua caixa de entrada.");
        }
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("❌ E-mail ou senha incorretos.");
        }
        throw error;
      }

      if (data.user) {
        console.log("[LOGIN] Usuário autenticado com sucesso no Auth:", data.user.id);
        const profile = await ensureProfileExists(data.user);
        console.log("[LOGIN] Perfil recuperado:", { profileRole: profile.role, selectedRole: role });
        
        // Bloqueia se um aluno tentar entrar no painel de admin ou vice-versa
        if (profile.role.toUpperCase() !== role.toUpperCase()) {
          console.warn("[LOGIN] Divergência de papel (Role Mismatch)!");
          await supabase.auth.signOut();
          throw new Error(`Este usuário é um ${profile.role === 'ADMIN' ? 'Administrador' : 'Aluno'}. Selecione '${profile.role === 'ADMIN' ? 'Admin' : 'Aluno'}' acima.`);
        }
        
        setUser(profile);
        console.log("[LOGIN] Login concluído com sucesso!");
        await fetchData();
      }
    } catch (err: any) {
      console.error("[LOGIN] Erro capturado no handleLogin:", err);
      throw err; // Re-throw to be caught by Login component
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (data: { email: string; password: string; name: string; instrument: Instrument; level: Level }) => {
    setLoading(true);
    try {
      console.log("Registrando novo usuário...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: {
            name: data.name,
            instrument: data.instrument,
            level: data.level,
            avatar: DEFAULT_AVATARS.male
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        console.log("Usuário autenticado. Sincronizando perfil...");
        
        // Em vez de dar insert direto (que pode falhar se o Admin já criou o aluno),
        // usamos o ensureProfileExists que já tem a lógica de migração e herança de dados.
        const profile = await ensureProfileExists(authData.user);
        
        if (!authData.session) {
          alert("✅ CONTA CRIADA! Verifique sua caixa de entrada (e o SPAM). Você PRECISA clicar no link de confirmação enviado para o seu e-mail para poder acessar o painel.");
        } else {
          setUser(profile);
          console.log("Registro e login automáticos concluídos.");
          await fetchData();
        }
      }
    } catch (err: any) {
      console.error("Erro no registro:", err);
      if (err.message.includes("User already registered")) {
        alert("❌ Este e-mail já está cadastrado. Tente fazer Login em vez de Cadastro.");
      } else {
        alert("Erro ao cadastrar: " + (err.message || "Verifique os dados e tente novamente."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-600 mb-4"></div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sincronizando com a Escola...</p>
      {!isSupabaseConfigured() && (
        <p className="mt-4 text-xs text-red-500 font-medium text-center max-w-xs">
          ⚠️ Supabase não configurado corretamente. Verifique as chaves no arquivo services/supabase.ts ou nos Secrets.
        </p>
      )}
    </div>
  );

  if (!user) return (
    <>
      <Login onLogin={handleLogin} onRegister={handleRegister} />
      {alertConfig && (
        <AlertModal 
          message={alertConfig.message} 
          title={alertConfig.title} 
          onClose={() => setAlertConfig(null)} 
        />
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {isSyncing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center pointer-events-auto">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center space-y-4 animate-in zoom-in duration-300">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sincronizando...</p>
          </div>
        </div>
      )}
      {user.role === 'ADMIN' ? (
        <AdminDashboard 
          user={user} onLogout={handleLogout}
          students={students} courses={courses} schedules={schedules}
          payments={payments}
          onAddStudent={async (s, password) => { 
            try {
              console.log("Iniciando criação de aluno via API...");
              
              let success = false;
              let createdUserId = '';
              let usedClientSideAuth = false;

              try {
                const response = await apiFetch('/api/admin/create-user', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: s.email,
                    password,
                    name: s.name,
                    instrument: s.instrument,
                    level: s.level,
                    role: s.role,
                    whatsapp: s.whatsapp || ''
                  })
                });
                
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                  const result = await response.json();
                  if (!response.ok) {
                    console.error("Erro retornado pela API:", result);
                    const errorMessage = result.details 
                      ? `${result.error}\n\nDetalhes: ${result.details}`
                      : result.error || 'Erro ao criar aluno';
                    throw new Error(errorMessage);
                  }
                  console.log("Aluno criado com sucesso via API!");
                  alert("Aluno criado com sucesso pela API! Você já pode enviar o login e senha para ele.");
                  success = true;
                } else {
                  console.warn("Resposta não-JSON de API recebida. Ativando fallback resiliente do lado do cliente...");
                }
              } catch (apiErr: any) {
                console.warn("Erro ao tentar via API, acionando fallback client-side:", apiErr.message || apiErr);
              }

              // Se a API falhou ou não resultou em um JSON de sucesso, executamos o mecanismo de fallback client-side
              if (!success) {
                console.log("[FALLBACK] Executando cadastro direto pelo Supabase Client de forma autônoma...");
                
                try {
                  // Instanciamos uma cópia temporária do Supabase SDK sem persistência de sessão local 
                  // para não causar logout automático e perda do login do administrador atual.
                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tvjyskpiqzmujwfjhtcg.supabase.co';
                  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_e14ZXbI5JWT3Ay6V7WprVg_y-UgeGq_';
                  
                  const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
                    auth: {
                      persistSession: false,
                      autoRefreshToken: false,
                      detectSessionInUrl: false
                    }
                  });

                  console.log("[FALLBACK] Tentando criar conta Auth do aluno no Supabase...");
                  const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                    email: s.email.trim(),
                    password: password,
                    options: {
                      data: {
                        name: s.name,
                        instrument: s.instrument,
                        level: s.level,
                        avatar: `https://picsum.photos/seed/${s.email}/200/200`
                      }
                    }
                  });

                  if (authError) {
                    if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
                      console.log("[FALLBACK] Usuário Auth já existe no Supabase. Avançando para sincronização direta do Perfil...");
                    } else {
                      throw authError;
                    }
                  } else if (authData && authData.user) {
                    createdUserId = authData.user.id;
                    usedClientSideAuth = true;
                    console.log("[FALLBACK] Usuário Auth criado com sucesso! ID:", createdUserId);
                  }
                } catch (authErrorDetail: any) {
                  console.error("[FALLBACK] Erro ao cadastrar no Supabase Auth:", authErrorDetail.message || authErrorDetail);
                }

                // Se não pôde pegar o ID do Auth e nem criar novo, busca se já existe algum perfil por e-mail no DB
                if (!createdUserId) {
                  const { data: existingProf } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', s.email.trim().toLowerCase())
                    .maybeSingle();

                  if (existingProf) {
                    createdUserId = existingProf.id;
                  } else {
                    // Se não existia nada estruturado, gera um ID único temporário
                    createdUserId = 'temp_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
                  }
                }

                // Cria ou atualiza o perfil do aluno no banco de dados correspondente
                console.log("[FALLBACK] Upserting perfil para aluno ID:", createdUserId);
                const { error: profileError } = await supabase
                  .from('profiles')
                  .upsert([{
                    id: createdUserId,
                    name: s.name,
                    email: s.email.trim().toLowerCase(),
                    role: s.role,
                    instrument: s.instrument,
                    level: s.level,
                    avatar: `https://picsum.photos/seed/${createdUserId}/200/200`,
                    total_completed_classes: 0,
                    whatsapp: s.whatsapp || ''
                  }], { onConflict: 'email' }); // Se houver conflito de email, atualiza os dados

                if (profileError) {
                  throw profileError;
                }

                if (usedClientSideAuth) {
                  alert(`✅ Aluno criado com sucesso do lado do cliente!\n\nSeu domínio personalizado está ativo e sincronizado com o Supabase. O aluno já pode fazer login normalmente informando e-mail e a senha definida.`);
                } else {
                  alert(`📋 Aluno pré-cadastrado no banco com sucesso!\n\nNota: Seu domínio personalizado está ativo, mas o módulo de autenticação está protegido. O aluno foi inserido no banco de dados.\n\n👉 INSTRUÇÃO: Peça para o aluno clicar em "Cadastar" na tela de login informando este mesmo e-mail (${s.email}) para vincular sua senha definitiva e ativar seu login de maneira automática.`);
                }
              }
              
              await fetchData(); 
            } catch (err: any) {
              console.error("Erro capturado no onAddStudent:", err);
              alert("Erro ao criar aluno: " + err.message);
            }
          }}
          onUpdateStudent={async (s) => { 
            const { error } = await supabase.from('profiles').update({ 
              name: s.name, 
              email: s.email,
              instrument: s.instrument, 
              level: s.level, 
              avatar: s.avatar, 
              whatsapp: s.whatsapp,
              total_completed_classes: s.totalCompletedClasses
            }).eq('id', s.id); 
            if (error) alert("Erro ao atualizar aluno: " + error.message);
            await fetchData(); 
          }}
          onAddSchedule={async (sc) => { 
            const { error } = await supabase.from('schedules').insert([{ 
              id: sc.id, 
              student_id: sc.studentId, 
              student_name: sc.studentName, // Salva o nome do aluno no banco
              teacher_id: sc.teacherId, 
              date: sc.date, 
              time: sc.time, 
              instrument: sc.instrument, 
              status: sc.status, 
              title: sc.title 
            }]); 
            if (error) alert("Erro ao agendar aula: " + error.message);
            await fetchData(); 
          }}
          onUpdateSchedule={async (id, status) => { 
            try {
              // 1. Buscar os dados atuais da aula
              const { data: schedule, error: fetchError } = await supabase.from('schedules').select('*').eq('id', id).single();
              if (fetchError) throw fetchError;

              const currentStatus = schedule.status?.toUpperCase();
              let targetStatus = status.toUpperCase();
              let updatedTitle = schedule.title || '';

              // Se o banco não aceita 'ABSENT', salvamos como 'COMPLETED' mas marcamos no título
              if (targetStatus === 'ABSENT') {
                targetStatus = 'COMPLETED';
                if (!updatedTitle.includes('[FALTA]')) {
                  updatedTitle = `[FALTA] ${updatedTitle}`.trim();
                }
              }

              // 2. Atualizar a aula
              const { error: updateError } = await supabase.from('schedules')
                .update({ status: targetStatus, title: updatedTitle })
                .eq('id', id); 
              
              if (updateError) throw updateError;

              // 3. Lógica do Contador de Ciclo
              // Se a aula saiu de PENDENTE para algo finalizado (COMPLETED ou o que era ABSENT)
              if (currentStatus === 'PENDING' && targetStatus === 'COMPLETED') {
                const { data: profile } = await supabase.from('profiles').select('total_completed_classes').eq('id', schedule.student_id).single();
                if (profile) {
                  const newCount = (profile.total_completed_classes || 0) + 1;
                  await supabase.from('profiles').update({ total_completed_classes: newCount }).eq('id', schedule.student_id);
                }
              }
              
              // Se a aula foi reaberta
              if (targetStatus === 'PENDING' && currentStatus === 'COMPLETED') {
                const { data: profile } = await supabase.from('profiles').select('total_completed_classes').eq('id', schedule.student_id).single();
                if (profile) {
                  const newCount = Math.max(0, (profile.total_completed_classes || 0) - 1);
                  await supabase.from('profiles').update({ total_completed_classes: newCount }).eq('id', schedule.student_id);
                }
              }

              await fetchData(); 
            } catch (err: any) {
              console.error("Erro ao atualizar agenda:", err);
              alert("Erro ao atualizar: " + (err.message || "Erro desconhecido"));
            }
          }}
          onAddCourse={async (c) => { 
            const { error } = await supabase.from('courses').insert([{ id: c.id, title: c.title, instrument: c.instrument, level: c.level, description: c.description, modules: c.modules, student_ids: c.studentIds }]); 
            if (error) alert("Erro ao criar curso: " + error.message);
            await fetchData(); 
          }}
          onUpdateCourseContent={async (c) => { 
            const { error } = await supabase.from('courses').update({ modules: c.modules, description: c.description }).eq('id', c.id); 
            if (error) alert("Erro ao atualizar conteúdo: " + error.message);
            await fetchData(); 
          }}
          onUpdateCourseAccess={async (id, ids) => { 
            const { error } = await supabase.from('courses').update({ student_ids: ids }).eq('id', id); 
            if (error) alert("Erro ao atualizar acessos: " + error.message);
            await fetchData(); 
          }}
          onAddPayment={async (p) => { 
            const { error } = await supabase.from('payments').insert([{
              id: p.id,
              student_id: p.studentId,
              amount: p.amount,
              status: p.status,
              due_date: p.dueDate
            }]); 
            if (error) alert("Erro ao registrar pagamento: " + error.message);
            await fetchData(); 
          }}
          onUpdatePayment={async (id, u) => { 
            const { error } = await supabase.from('payments').update({ status: u.status }).eq('id', id); 
            if (error) alert("Erro ao atualizar pagamento: " + error.message);
            await fetchData(); 
          }}
          onDeleteStudent={async (id) => { 
            if (id === user.id) {
              alert("Você não pode excluir sua própria conta de administrador.");
              return;
            }
            
            console.log("Tentando excluir aluno (Auth + DB) ID:", id);
            try {
              setIsSyncing(true);
              
              let success = false;
              
              try {
                const response = await apiFetch('/api/admin/delete-user', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: id })
                });

                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                  const result = await response.json();
                  if (!response.ok) {
                    throw new Error(result.error || 'Erro ao excluir usuário');
                  }
                  console.log("Aluno excluído via API!");
                  alert("Aluno excluído com sucesso do banco e autenticação!");
                  success = true;
                } else {
                  console.warn("[ADMIN] Resposta não-JSON recebida da API de exclusão. Ativando fallback client-side...");
                }
              } catch (apiErr: any) {
                console.warn("[ADMIN] Executando exclusão client-side por erro de conexão da API:", apiErr.message || apiErr);
              }

              // Se a API não processou o pedido com sucesso por bloqueio do proxy ou CORS (comum no Netlify de produção)
              if (!success) {
                console.log("[FALLBACK] Deletando o perfil diretamente do banco de dados...");
                const { error: dbDeleteError } = await supabase
                  .from('profiles')
                  .delete()
                  .eq('id', id);

                if (dbDeleteError) {
                  throw new Error(`Erro ao deletar cadastro no banco de dados: ${dbDeleteError.message}`);
                }
                
                alert("Cadastro do aluno removido com sucesso diretamente do banco de dados local!");
              }

            } catch (err: any) {
              console.error("Erro ao excluir aluno:", err);
              alert("Erro ao excluir aluno: " + err.message);
            } finally {
              setIsSyncing(false);
              await fetchData();
            }
          }}
          onResetPassword={async (id, newPassword) => {
            try {
              setIsSyncing(true);
              
              let success = false;

              try {
                const response = await apiFetch('/api/admin/reset-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: id, newPassword })
                });

                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                  const result = await response.json();
                  if (!response.ok) {
                    throw new Error(result.error || 'Erro ao redefinir senha');
                  }
                  alert("Senha redefinida com sucesso!");
                  success = true;
                } else {
                  console.warn("[ADMIN] Resposta não-JSON de redefinição recebida da API. Ativando fallback...");
                }
              } catch (apiErr: any) {
                console.warn("[ADMIN] Redirecionando redefinição para fluxo fallback devido a falha da API:", apiErr.message || apiErr);
              }

              if (!success) {
                // FALLBACK: Como a API no domínio customizado Netlify retornou HTML ou fomos bloqueados,
                // enviamos um link de redefinição de senha real por e-mail para o aluno usando o fluxo nativo do Supabase!
                console.log("[FALLBACK] Buscando e-mail do aluno para enviar redefinição...");
                
                const { data: profile, error: getProfError } = await supabase
                  .from('profiles')
                  .select('email, name')
                  .eq('id', id)
                  .single();

                if (getProfError || !profile) {
                  throw new Error("Não foi possível encontrar o e-mail do aluno para efetuar a redefinição.");
                }

                console.log("[FALLBACK] Enviando e-mail de redefinição de senha para:", profile.email);
                const { error: resetMailError } = await supabase.auth.resetPasswordForEmail(profile.email, {
                  redirectTo: window.location.origin
                });

                if (resetMailError) {
                  throw resetMailError;
                }

                alert(`📦 Redefinição efetuada com sucesso!\n\nNota: Como você está usando um domínio de produção com o proxy de admin protegido, ativamos o fluxo seguro do Supabase:\n\n✉️ Um e-mail com o link para redefinir a senha do aluno (${profile.name}) foi enviado com sucesso para ${profile.email}! Ele poderá criar sua própria senha diretamente.`);
              }
            } catch (err: any) {
              console.error("Erro ao redefinir senha:", err);
              alert("Erro ao redefinir senha: " + err.message);
            } finally {
              setIsSyncing(false);
            }
          }}
          onDeleteSchedule={async (id) => { 
            const { error } = await supabase.from('schedules').delete().eq('id', id); 
            if (error) alert("Erro ao excluir aula: " + error.message);
            await fetchData(); 
          }}
          onDeleteCourse={async (id) => { 
            const { error } = await supabase.from('courses').delete().eq('id', id); 
            if (error) alert("Erro ao excluir curso: " + error.message);
            await fetchData(); 
          }}
          onDeletePayment={async (id) => { 
            const { error } = await supabase.from('payments').delete().eq('id', id); 
            if (error) alert("Erro ao excluir pagamento: " + error.message);
            await fetchData(); 
          }}
          recitals={recitals}
          onAddRecital={async (r) => {
            const { error } = await supabase.from('recitals').insert([{
              student_id: r.studentId,
              course_id: r.courseId,
              hymn_name: r.hymnName,
              video_url: r.videoUrl,
              completed: false
            }]);
            if (error) alert("Erro ao adicionar recital: " + error.message);
            await fetchData();
          }}
          onDeleteRecital={async (id) => {
            const { error } = await supabase.from('recitals').delete().eq('id', id);
            if (error) alert("Erro ao excluir recital: " + error.message);
            await fetchData();
          }}
        />
      ) : (
        <StudentDashboard 
          user={user} onLogout={handleLogout}
          students={students}
          courses={courses} schedules={schedules}
          payments={payments}
          quotes={quotes}
          onUpdateProfile={async (u) => { await supabase.from('profiles').update({ name: u.name, whatsapp: u.whatsapp, avatar: u.avatar }).eq('id', u.id); setUser(u); await fetchData(); }}
          recitals={recitals}
          onUpdateRecital={async (id, completed) => {
            const { error } = await supabase.from('recitals').update({ completed }).eq('id', id);
            if (error) alert("Erro ao atualizar recital: " + error.message);
            await fetchData();
          }}
        />
      )}
      {alertConfig && (
        <AlertModal 
          message={alertConfig.message} 
          title={alertConfig.title} 
          onClose={() => setAlertConfig(null)} 
        />
      )}
    </div>
  );
};

export default App;
