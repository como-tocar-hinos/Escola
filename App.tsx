
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Course, ScheduledClass, Payment, Material, Instrument, Level } from './types';
import { MOCK_ADMIN, MOCK_STUDENTS, MOCK_COURSES, MOCK_SCHEDULES, MOCK_PAYMENTS, MOCK_MATERIALS, DEFAULT_AVATARS } from './constants';
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard';
import Login from './components/Login';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [schedules, setSchedules] = useState<ScheduledClass[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const fetchData = useCallback(async () => {
    console.log("Iniciando busca de dados...");
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
      if (dbSchedules) setSchedules(dbSchedules.map((s: any) => ({ ...s, studentId: s.student_id, teacherId: s.teacher_id, status: s.status?.toUpperCase() || 'PENDING' })));

      // 4. Buscar Pagamentos
      const { data: dbPayments, error: payError } = await supabase.from('payments').select('*');
      if (payError) throw payError;
      if (dbPayments) setPayments(dbPayments.map((p: any) => ({ ...p, studentId: p.student_id, dueDate: p.due_date, status: (p.status || 'PENDING').toUpperCase() })));
      
      // 5. Buscar Materiais
      const { data: dbMaterials, error: mError } = await supabase.from('materials').select('*');
      if (mError) throw mError;
      if (dbMaterials) setMaterials(dbMaterials);

      console.log("Dados carregados com sucesso!");
    } catch (err: any) {
      console.error("Erro na busca de dados:", err);
      // Usamos mocks se houver erro para não travar o app
      console.warn("Usando mocks devido a erro no banco.");
      setStudents(MOCK_STUDENTS);
      setCourses(MOCK_COURSES);
      setSchedules(MOCK_SCHEDULES);
      setPayments(MOCK_PAYMENTS);
      setMaterials(MOCK_MATERIALS);
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
          // 2. Atualizar todas as tabelas relacionadas para o novo ID
          await supabase.from('schedules').update({ student_id: authUser.id }).eq('student_id', preRegistered.id);
          await supabase.from('payments').update({ student_id: authUser.id }).eq('student_id', preRegistered.id);
          
          // 3. Atualizar acesso aos cursos
          const { data: coursesToUpdate } = await supabase.from('courses').select('id, student_ids');
          if (coursesToUpdate) {
            for (const course of coursesToUpdate) {
              if (course.student_ids?.includes(preRegistered.id)) {
                const updatedIds = course.student_ids.map((id: string) => id === preRegistered.id ? authUser.id : id);
                await supabase.from('courses').update({ student_ids: updatedIds }).eq('id', course.id);
              }
            }
          }

          // 4. Deletar o perfil temporário antigo
          await supabase.from('profiles').delete().eq('id', preRegistered.id);
          
          console.log("Sincronização concluída com sucesso!");
          profile = { ...preRegistered, id: authUser.id };
        } else {
          console.error("Erro ao criar perfil real:", createError);
        }
      }
    }

    if (profile) {
      return { 
        ...profile, 
        role: profile.role.toUpperCase(),
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
      console.log("Checando sessão...");
      const timeout = setTimeout(() => {
        if (loading) {
          console.warn("Timeout na checagem de sessão. Forçando carregamento...");
          setLoading(false);
        }
      }, 5000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log("Sessão encontrada para:", session.user.email);
          const profile = await ensureProfileExists(session.user);
          setUser(profile);
          // Busca os dados APÓS confirmar que o usuário está logado
          await fetchData();
        } else {
          console.log("Nenhuma sessão ativa.");
        }
      } catch (e) {
        console.error("Erro ao checar sessão inicial:", e);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleLogin = async (email: string, password: string, role: UserRole) => {
    setLoading(true);
    console.log(`Tentando login: ${email} como ${role}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          throw new Error("⚠️ Seu e-mail foi cadastrado mas falta confirmar o link enviado para sua caixa de entrada.");
        }
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("❌ E-mail ou senha incorretos.");
        }
        throw error;
      }

      if (data.user) {
        const profile = await ensureProfileExists(data.user);
        
        // Bloqueia se um aluno tentar entrar no painel de admin ou vice-versa
        if (profile.role !== role) {
          await supabase.auth.signOut();
          throw new Error(`Este usuário é um ${profile.role}. Selecione '${profile.role === 'ADMIN' ? 'Admin' : 'Aluno'}' acima.`);
        }
        
        setUser(profile);
        console.log("Login realizado com sucesso!");
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Ocorreu um erro inesperado ao entrar.");
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
        // Tenta criar o perfil imediatamente por conveniência
        await supabase.from('profiles').insert([{
          id: authData.user.id,
          name: data.name,
          email: data.email.trim(),
          role: 'STUDENT',
          instrument: data.instrument,
          level: data.level,
          avatar: DEFAULT_AVATARS.male,
          total_completed_classes: 0
        }]);
        
        if (!authData.session) {
          alert("✅ CONTA CRIADA! Verifique seu e-mail agora. Você PRECISA clicar no link de confirmação para poder entrar.");
        } else {
          // Caso o Supabase esteja configurado para logar direto sem confirmação
          const profile = await ensureProfileExists(authData.user);
          setUser(profile);
          await fetchData();
        }
      }
    } catch (err: any) {
      alert("Erro ao cadastrar: " + err.message);
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
    </div>
  );

  if (!user) return <Login onLogin={handleLogin} onRegister={handleRegister} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {user.role === 'ADMIN' ? (
        <AdminDashboard 
          user={user} onLogout={handleLogout}
          students={students} courses={courses} schedules={schedules}
          payments={payments} materials={materials}
          onAddStudent={async (s) => { 
            const { error } = await supabase.from('profiles').insert([{
              id: s.id,
              name: s.name,
              email: s.email,
              role: s.role,
              instrument: s.instrument,
              level: s.level,
              avatar: s.avatar,
              whatsapp: s.whatsapp,
              total_completed_classes: s.totalCompletedClasses || 0
            }]); 
            if (error) alert("Erro ao criar aluno: " + error.message);
            await fetchData(); 
          }}
          onUpdateStudent={async (s) => { 
            const { error } = await supabase.from('profiles').update({ 
              name: s.name, 
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
            const { error } = await supabase.from('schedules').insert([{ id: sc.id, student_id: sc.studentId, teacher_id: sc.teacherId, date: sc.date, time: sc.time, instrument: sc.instrument, status: sc.status, title: sc.title }]); 
            if (error) alert("Erro ao agendar aula: " + error.message);
            await fetchData(); 
          }}
          onUpdateSchedule={async (id, status) => { 
            const { error } = await supabase.from('schedules').update({ status }).eq('id', id); 
            if (error) alert("Erro ao atualizar status da aula: " + error.message);
            await fetchData(); 
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
            
            console.log("Tentando excluir aluno ID:", id);
            const { error } = await supabase.from('profiles').delete().eq('id', id); 
            
            if (error) {
              console.error("Erro ao excluir:", error);
              if (error.message.includes("referenced from table")) {
                alert("Não é possível excluir este aluno pois ele possui aulas ou pagamentos vinculados. Por favor, exclua as aulas e pagamentos dele primeiro ou execute o script SQL de 'CASCADE' que enviei.");
              } else {
                alert("Erro ao excluir aluno: " + error.message);
              }
            } else {
              console.log("Aluno excluído com sucesso.");
            }
            await fetchData(); 
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
        />
      ) : (
        <StudentDashboard 
          user={user} onLogout={handleLogout}
          courses={courses} schedules={schedules}
          materials={materials} payments={payments}
          onUpdateProfile={async (u) => { await supabase.from('profiles').update({ name: u.name, whatsapp: u.whatsapp, avatar: u.avatar }).eq('id', u.id); setUser(u); await fetchData(); }}
        />
      )}
    </div>
  );
};

export default App;
