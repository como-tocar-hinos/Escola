
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';

async function startServer() {
  const app = express();
  const PORT = 3000;

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
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, name, instrument, level, role, whatsapp } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    
    console.log(`[ADMIN] Iniciando processo para: ${trimmedEmail}`);
    
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Configuração incompleta: SUPABASE_SERVICE_ROLE_KEY ausente." });
    }

    try {
      let userId: string;

      // 1. Tenta criar o usuário
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password: password,
        email_confirm: true, // Pula a necessidade de clicar no link do e-mail
        user_metadata: { name }
      });

      if (authError) {
        // Se o erro for que o usuário já existe, vamos apenas atualizar a senha dele
        if (authError.message.includes("already registered") || authError.status === 422) {
          console.log("[ADMIN] Usuário já existe no Auth. Localizando ID...");
          
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (listError) throw listError;
          
          const existingUser = (users as any[]).find(u => u.email?.toLowerCase() === trimmedEmail);
          if (!existingUser) throw new Error("Usuário consta como registrado mas não foi encontrado na lista.");
          
          userId = existingUser.id;
          console.log(`[ADMIN] Atualizando senha e confirmando e-mail para ID: ${userId}`);
          
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: password,
            email_confirm: true
          });
          
          if (updateError) throw updateError;
        } else {
          throw authError;
        }
      } else {
        userId = authData.user.id;
        console.log(`[ADMIN] Novo usuário criado com sucesso: ${userId}`);
      }

      // 2. Sincroniza o Perfil no Banco de Dados
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

      if (profileError) throw profileError;

      res.json({ success: true, userId });
    } catch (error: any) {
      console.error("[ADMIN] Erro crítico no processo:", error);
      res.status(400).json({ error: error.message || "Erro ao processar usuário" });
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
