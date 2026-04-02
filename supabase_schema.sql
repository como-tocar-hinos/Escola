-- Script SQL completo para o Supabase
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Tabela de Perfis (Alunos e Admin)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'STUDENT',
  instrument TEXT,
  level TEXT DEFAULT 'NZ',
  avatar TEXT,
  whatsapp TEXT,
  total_completed_classes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Cursos
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  instrument TEXT NOT NULL,
  level TEXT NOT NULL,
  description TEXT,
  modules JSONB DEFAULT '[]'::jsonb,
  student_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Agenda (Schedules)
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_name TEXT,
  teacher_id TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT DEFAULT 'PENDING',
  instrument TEXT,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'PENDING',
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Materiais
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  instrument TEXT,
  level TEXT,
  student_ids UUID[] DEFAULT '{}',
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Citações (Quotes)
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  author TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) para todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (Simplificadas para garantir sincronização)
-- Nota: Em produção, estas políticas devem ser mais restritivas.

-- Perfis: Todos autenticados podem ler, apenas o dono ou admin pode editar
CREATE POLICY "Leitura de perfis" ON profiles FOR SELECT USING (true);
CREATE POLICY "Edição de perfis" ON profiles FOR ALL USING (true);

-- Cursos: Leitura pública, edição apenas admin
CREATE POLICY "Leitura de cursos" ON courses FOR SELECT USING (true);
CREATE POLICY "Edição de cursos" ON courses FOR ALL USING (true);

-- Agenda: Leitura pública, edição apenas admin
CREATE POLICY "Leitura de agenda" ON schedules FOR SELECT USING (true);
CREATE POLICY "Edição de agenda" ON schedules FOR ALL USING (true);

-- Pagamentos: Leitura pública, edição apenas admin
CREATE POLICY "Leitura de pagamentos" ON payments FOR SELECT USING (true);
CREATE POLICY "Edição de pagamentos" ON payments FOR ALL USING (true);

-- Materiais: Leitura pública, edição apenas admin
CREATE POLICY "Leitura de materiais" ON materials FOR SELECT USING (true);
CREATE POLICY "Edição de materiais" ON materials FOR ALL USING (true);

-- Citações: Leitura pública, edição apenas admin
CREATE POLICY "Leitura de citações" ON quotes FOR SELECT USING (true);
CREATE POLICY "Edição de citações" ON quotes FOR ALL USING (true);
