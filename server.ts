
import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize Supabase Admin Client
  const supabaseUrl = 'https://tvjyskpiqzmujwfjhtcg.supabase.co';
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
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      hasAdminKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY 
    });
  });

  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, name, instrument, level, role, whatsapp } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    
    console.log(`[ADMIN] Iniciando processo para: ${trimmedEmail}`);
    
    if (!supabaseAdmin) {
      console.error("[ADMIN] Erro: SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente.");
      return res.status(500).json({ 
        error: "Configuração incompleta no servidor.",
        details: "A variável SUPABASE_SERVICE_ROLE_KEY não foi encontrada. Certifique-se de adicioná-la nos 'Secrets' do AI Studio para o site publicado."
      });
    }

    try {
      let userId: string;

      // 1. Tenta criar o usuário
      console.log("[ADMIN] Tentando criar usuário no Supabase Auth...");
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password: password,
        email_confirm: true,
        user_metadata: { name }
      });

      if (authError) {
        console.warn("[ADMIN] Erro ao criar no Auth:", authError.message);
        // Se o erro for que o usuário já existe, vamos apenas atualizar a senha dele
        if (authError.message.includes("already registered") || authError.status === 422) {
          console.log("[ADMIN] Usuário já existe no Auth. Localizando ID...");
          
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (listError) {
            console.error("[ADMIN] Erro ao listar usuários:", listError);
            throw listError;
          }
          
          const existingUser = (users as any[]).find(u => u.email?.toLowerCase() === trimmedEmail);
          if (!existingUser) {
            console.error("[ADMIN] Usuário não encontrado na lista apesar do erro de duplicidade.");
            throw new Error("Usuário consta como registrado mas não foi encontrado na lista.");
          }
          
          userId = existingUser.id;
          console.log(`[ADMIN] Atualizando senha e confirmando e-mail para ID: ${userId}`);
          
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: password,
            email_confirm: true
          });
          
          if (updateError) {
            console.error("[ADMIN] Erro ao atualizar usuário existente:", updateError);
            throw updateError;
          }
        } else {
          throw authError;
        }
      } else {
        userId = authData.user.id;
        console.log(`[ADMIN] Novo usuário criado com sucesso no Auth: ${userId}`);
      }

      // 2. Sincroniza o Perfil no Banco de Dados
      console.log("[ADMIN] Sincronizando perfil na tabela 'profiles'...");
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert([{
          id: userId,
          name,
          email: trimmedEmail,
          role: role || 'STUDENT',
          instrument,
          level,
          avatar: `https://picsum.photos/seed/${userId}/200/200`,
          total_completed_classes: 0,
          whatsapp: whatsapp || ''
        }], { onConflict: 'id' });

      if (profileError) {
        console.error("[ADMIN] Erro ao sincronizar perfil no banco:", profileError);
        throw profileError;
      }

      console.log("[ADMIN] Processo concluído com sucesso para:", trimmedEmail);
      res.json({ success: true, userId });
    } catch (error: any) {
      console.error("[ADMIN] Erro crítico no processo:", error);
      res.status(400).json({ 
        error: error.message || "Erro ao processar usuário",
        details: error.details || error.hint || ""
      });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
