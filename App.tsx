
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Course, ScheduledClass, Payment, Instrument, Level, LessonDB, Quote, Recital } from './types';
import { MOCK_ADMIN, MOCK_STUDENTS, MOCK_COURSES, MOCK_SCHEDULES, MOCK_PAYMENTS, DEFAULT_AVATARS } from './constants';
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard';
import Login from './components/Login';
import { supabase, isSupabaseConfigured } from './services/supabase';

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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

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

  if (!user) return <Login onLogin={handleLogin} onRegister={handleRegister} />;

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
              const apiBaseUrl = getApiBaseUrl();
              
              const response = await fetch(`${apiBaseUrl}/api/admin/create-user`, {
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
              let result;
              if (contentType && contentType.includes("application/json")) {
                result = await response.json();
              } else {
                const text = await response.text();
                console.error("Resposta não-JSON recebida:", text);
                const isNetlify = window.location.hostname.includes('netlify') || window.location.hostname.includes('comotocarhinos.com.br');
                throw new Error(`O servidor retornou uma resposta inesperada (não-JSON). ${isNetlify ? '\n\nDetectamos que você está usando um domínio customizado. Tentei falar diretamente com o servidor de API, mas ele ainda retornou HTML. Isso pode acontecer se o servidor estiver reiniciando ou se houver um erro de CORS.' : ''}\n\nURL Tentada: ${apiBaseUrl}/api/admin/create-user\n\nResposta: ${text.substring(0, 100)}...`);
              }

              if (!response.ok) {
                console.error("Erro retornado pela API:", result);
                const errorMessage = result.details 
                  ? `${result.error}\n\nDetalhes: ${result.details}`
                  : result.error || 'Erro ao criar aluno';
                throw new Error(errorMessage);
              }
              
              console.log("Aluno criado com sucesso!");
              alert("Aluno criado com sucesso! Você já pode enviar o login e senha para ele.");
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
              const apiBaseUrl = getApiBaseUrl();
              
              const response = await fetch(`${apiBaseUrl}/api/admin/delete-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: id })
              });

              if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Erro ao excluir usuário do Auth');
              }

              console.log("Aluno excluído com sucesso do Auth e DB.");
              alert("Aluno excluído com sucesso!");
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
              const apiBaseUrl = getApiBaseUrl();
              
              const response = await fetch(`${apiBaseUrl}/api/admin/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: id, newPassword })
              });

              if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Erro ao redefinir senha');
              }

              alert("Senha redefinida com sucesso!");
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
    </div>
  );
};

export default App;
