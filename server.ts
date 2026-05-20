
import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  const allowedOrigins = [
    "https://comotocarhinos.com.br", 
    "https://www.comotocarhinos.com.br",
    "https://ais-pre-rbl2ofvwsttjhlv4aw5fn5-67364419988.us-west2.run.app", 
    "https://ais-dev-rbl2ofvwsttjhlv4aw5fn5-67364419988.us-west2.run.app", 
    "http://localhost:3000",
    "http://localhost:5173"
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const lowerOrigin = origin.toLowerCase();
      const isAllowed = 
        allowedOrigins.includes(origin) || 
        lowerOrigin.includes("comotocarhinos.com.br") || 
        lowerOrigin.includes("run.app") || 
        lowerOrigin.includes("netlify.app") ||
        lowerOrigin.includes("localhost:");
        
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Rejected origin: ${origin}`);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
  app.use(express.json());

  // Initialize Supabase Admin Client
  const supabaseUrl = process.env.SUPABASE_URL || 'https://tvjyskpiqzmujwfjhtcg.supabase.co';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseAdmin = supabaseServiceRoleKey 
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null;

  // API routes
  app.get(["/api/health", "/api/health/"], (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      hasAdminKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY 
    });
  });

  app.post(["/api/admin/create-user", "/api/admin/create-user/"], async (req, res) => {
    const { email, password, name, instrument, level, role, whatsapp } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    
    console.log(`[ADMIN] Iniciando processo para criar: ${trimmedEmail}`);
    
    if (!supabaseAdmin) {
      console.error("[ADMIN] Erro: SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente.");
      return res.status(500).json({ 
        error: "Configuração incompleta no servidor.",
        details: "A variável SUPABASE_SERVICE_ROLE_KEY não foi encontrada. Certifique-se de adicioná-la nos 'Secrets' do AI Studio para o site publicado."
      });
    }

    try {
      let userId: string;

      // 1. Procurar se existe esse usuário no Auth
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000
      });
      if (listError) throw listError;
      
      const existingAuthUser = (users as any[])?.find((u: any) => u.email?.toLowerCase() === trimmedEmail);
      
      if (existingAuthUser) {
        userId = existingAuthUser.id;
        console.log(`[ADMIN] Usuário já registrado no Auth com ID: ${userId}. Atualizando senha...`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: password,
          email_confirm: true
        });
        if (updateError) throw updateError;
      } else {
        console.log("[ADMIN] Criando novo usuário no Supabase Auth...");
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: trimmedEmail,
          password: password,
          email_confirm: true,
          user_metadata: { name }
        });
        
        if (authError) {
          console.error("[ADMIN] Erro ao criar Auth:", authError);
          throw authError;
        }
        userId = authData.user.id;
        console.log(`[ADMIN] Novo usuário criado no Auth com ID: ${userId}`);
      }

      // 2. Procurar se existe algum registro na tabela 'profiles' com este e-mail
      const { data: existingProfile, error: profileGetError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (profileGetError) {
        console.warn("[ADMIN] Erro ao buscar perfil existente por e-mail:", profileGetError);
      }

      if (existingProfile) {
        console.log(`[ADMIN] Encontrado perfil existente com e-mail ${trimmedEmail} (ID: ${existingProfile.id})`);
        
        // Se o ID for divergente do Auth, nós migramos!
        if (existingProfile.id !== userId) {
          console.log(`[ADMIN] Divergência de ID encontrada no cadastro! Perfil: ${existingProfile.id} vs Auth: ${userId}. Migrando dados...`);
          
          // Criar novo perfil correto copiando os dados anteriores
          const { error: insertError } = await supabaseAdmin.from('profiles').insert([{
            id: userId,
            name: name || existingProfile.name,
            email: trimmedEmail,
            role: role || existingProfile.role || 'STUDENT',
            instrument: instrument || existingProfile.instrument,
            level: level || existingProfile.level || 'NZ',
            avatar: existingProfile.avatar || `https://picsum.photos/seed/${userId}/200/200`,
            total_completed_classes: existingProfile.total_completed_classes || 0,
            whatsapp: whatsapp || existingProfile.whatsapp || ''
          }]);
          
          if (insertError) {
            console.warn("[ADMIN] Erro ao migrar inserindo perfil correto:", insertError.message);
          }

          // Migrar todas as tabelas relacionadas
          await supabaseAdmin.from('schedules').update({ student_id: userId }).eq('student_id', existingProfile.id);
          await supabaseAdmin.from('payments').update({ student_id: userId }).eq('student_id', existingProfile.id);
          await supabaseAdmin.from('recitals').update({ student_id: userId }).eq('student_id', existingProfile.id);
          
          // Migrar relação de cursos
          const { data: allCourses } = await supabaseAdmin.from('courses').select('id, student_ids');
          if (allCourses) {
            for (const course of allCourses) {
              if (course.student_ids?.includes(existingProfile.id)) {
                const updatedIds = course.student_ids.map((id: string) => id === existingProfile.id ? userId : id);
                await supabaseAdmin.from('courses').update({ student_ids: updatedIds }).eq('id', course.id);
              }
            }
          }

          // Deletar perfil antigo
          await supabaseAdmin.from('profiles').delete().eq('id', existingProfile.id);
        } else {
          // ID é o mesmo, só atualiza os dados
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              name,
              role: role || 'STUDENT',
              instrument,
              level,
              whatsapp: whatsapp || ''
            })
            .eq('id', userId);
            
          if (updateError) throw updateError;
        }
      } else {
        // Não existia perfil nenhum, criamos do zero
        console.log("[ADMIN] Criando perfil totalmente novo do zero...");
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert([{
            id: userId,
            name,
            email: trimmedEmail,
            role: role || 'STUDENT',
            instrument,
            level: level || 'NZ',
            avatar: `https://picsum.photos/seed/${userId}/200/200`,
            total_completed_classes: 0,
            whatsapp: whatsapp || ''
          }]);

        if (profileError) {
          console.error("[ADMIN] Erro ao criar perfil do zero:", profileError);
          throw profileError;
        }
      }

      console.log("[ADMIN] Cadastro e sincronização concluídos com sucesso!");
      res.json({ success: true, userId });
    } catch (error: any) {
      console.error("[ADMIN] Erro crítico no processo de criação:", error);
      res.status(400).json({ 
        error: error.message || "Erro ao processar usuário",
        details: error.details || error.hint || ""
      });
    }
  });

  app.post(["/api/admin/delete-user", "/api/admin/delete-user/"], async (req, res) => {
    const { userId } = req.body;
    
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Configuração incompleta no servidor." });
    }

    try {
      console.log(`[ADMIN] Tentando deletar usuário do Auth: ${userId}`);
      try {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
          console.warn("[ADMIN] Alerta ao deletar do Auth (pode não existir):", authError.message);
        }
      } catch (authErrorDetail) {
         console.warn("[ADMIN] Exceção ao tentar deletar do Auth:", authErrorDetail);
      }

      console.log(`[ADMIN] Deletando perfil do DB: ${userId}`);
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error("[ADMIN] Erro ao deletar perfil:", profileError);
        throw profileError;
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao excluir usuário" });
    }
  });

  app.post(["/api/admin/reset-password", "/api/admin/reset-password/"], async (req, res) => {
    const { userId, newPassword } = req.body;
    
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Configuração incompleta no servidor.", details: "A variável SUPABASE_SERVICE_ROLE_KEY não foi configurada." });
    }

    try {
      console.log(`[ADMIN] Redefinindo senha para ID ou perfil: ${userId}`);
      
      // 1. Tentar pegar o e-mail do perfil no banco
      const { data: profile, error: profileGetError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileGetError || !profile) {
        console.error("[ADMIN] Perfil não encontrado no banco:", profileGetError);
        throw new Error("Perfil do aluno não encontrado no banco de dados.");
      }
      
      const trimmedEmail = profile.email.trim().toLowerCase();
      console.log(`[ADMIN] Perfil do e-mail encontrado: ${trimmedEmail}`);

      // 2. Procurar se existe esse usuário no Auth do Supabase
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000
      });
      if (listError) throw listError;
      
      const existingAuthUser = (users as any[])?.find((u: any) => u.email?.toLowerCase() === trimmedEmail);
      let authUserId: string;

      if (existingAuthUser) {
        // Encontrou no Auth! Atualiza a senha.
        authUserId = existingAuthUser.id;
        console.log(`[ADMIN] Usuário encontrado no Auth (ID: ${authUserId}). Atualizando senha...`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: newPassword,
          email_confirm: true
        });
        if (updateError) throw updateError;
      } else {
        // Não encontrou no Auth! Vamos criar o usuário Auth do zero e associá-lo.
        console.log(`[ADMIN] Usuário NÃO encontrado no Auth. Criando novo usuário Auth para: ${trimmedEmail}`);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: trimmedEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: { name: profile.name }
        });
        if (authError) throw authError;
        authUserId = authData.user.id;
        console.log(`[ADMIN] Novo usuário Auth criado com ID: ${authUserId}`);
      }

      // 3. Se o ID do perfil for diferente do ID do Auth, migramos!
      if (profile.id !== authUserId) {
        console.log(`[ADMIN] Divergência de ID! Perfil: ${profile.id} vs Auth: ${authUserId}. Iniciando migração de dados...`);
        
        // a. Copia o perfil para o novo ID
        const { error: insertError } = await supabaseAdmin.from('profiles').insert([{
          id: authUserId,
          name: profile.name,
          email: trimmedEmail,
          role: profile.role || 'STUDENT',
          instrument: profile.instrument,
          level: profile.level,
          avatar: profile.avatar || `https://picsum.photos/seed/${authUserId}/200/200`,
          total_completed_classes: profile.total_completed_classes || 0,
          whatsapp: profile.whatsapp || ''
        }]);
        
        if (insertError) {
          console.warn("[ADMIN] Alerta ao criar novo perfil migrado (talvez já exista):", insertError.message);
        }

        // b. Migrar todas as tabelas relacionadas
        console.log("[ADMIN] Migrando tabelas de agendamentos, pagamentos e recitais...");
        await supabaseAdmin.from('schedules').update({ student_id: authUserId }).eq('student_id', profile.id);
        await supabaseAdmin.from('payments').update({ student_id: authUserId }).eq('student_id', profile.id);
        await supabaseAdmin.from('recitals').update({ student_id: authUserId }).eq('student_id', profile.id);
        
        // c. Migrar cursos
        const { data: allCourses } = await supabaseAdmin.from('courses').select('id, student_ids');
        if (allCourses) {
          for (const course of allCourses) {
            if (course.student_ids?.includes(profile.id)) {
              const updatedIds = course.student_ids.map((id: string) => id === profile.id ? authUserId : id);
              await supabaseAdmin.from('courses').update({ student_ids: updatedIds }).eq('id', course.id);
            }
          }
        }

        // d. Deletar perfil antigo
        console.log("[ADMIN] Deletando perfil com ID divergente antigo...");
        await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
      }

      console.log(`[ADMIN] Senha redefinida e dados sincronizados com sucesso para: ${trimmedEmail}`);
      res.json({ success: true, userId: authUserId });
    } catch (error: any) {
      console.error("[ADMIN] Erro na redefinição de senha:", error);
      res.status(400).json({ error: error.message || "Erro ao redefinir senha" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Ensure API routes are NOT caught by the SPA fallback
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Rodando em http://0.0.0.0:${PORT}`);
    console.log(`[SERVER] Admin Key configurada: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
  });
}

startServer();
