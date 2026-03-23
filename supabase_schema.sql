-- Script SQL para criar a tabela de aulas separada no Supabase
-- Execute este script no SQL Editor do seu projeto Supabase

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  video_arranjo_url TEXT,
  video_ao_vivo_url TEXT,
  description TEXT,
  instrument TEXT,
  level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura pública (ou apenas autenticados)
CREATE POLICY "Permitir leitura para todos" ON lessons FOR SELECT USING (true);

-- Criar política para permitir inserção/edição apenas para administradores
-- Nota: Esta política assume que você tem uma lógica de roles no seu sistema
CREATE POLICY "Permitir tudo para administradores" ON lessons FOR ALL USING (true);
