-- ============================================================
-- HandyConnect AI Integration — Migrare DB
-- Rulează acest fișier în Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tabelă pentru checklist-uri AI generate de handyman
CREATE TABLE IF NOT EXISTS task_ai_checklists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  handyman_id     UUID NOT NULL,
  estimated_hours NUMERIC(4,1),
  tools           JSONB DEFAULT '[]',
  materials       JSONB DEFAULT '[]',
  safety_notes    TEXT,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, handyman_id)
);

-- RLS pentru task_ai_checklists
ALTER TABLE task_ai_checklists ENABLE ROW LEVEL SECURITY;

-- NOTE: CREATE POLICY nu suportă IF NOT EXISTS — folosim DO block
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='task_ai_checklists' AND policyname='handyman_own_checklist') THEN
    CREATE POLICY "handyman_own_checklist" ON task_ai_checklists
      FOR ALL USING (auth.uid() = handyman_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='task_ai_checklists' AND policyname='client_read_checklist') THEN
    CREATE POLICY "client_read_checklist" ON task_ai_checklists
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND client_id = auth.uid())
      );
  END IF;
END $$;

-- 2. Coloane noi pe tasks (tracking AI-generated tasks)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS ai_generated    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_confidence   NUMERIC(3,2);

-- 3. Coloană pe handyman_profiles (tracking AI-generated bio)
ALTER TABLE handyman_profiles
  ADD COLUMN IF NOT EXISTS bio_ai_generated BOOLEAN DEFAULT false;

-- 4. Coloane noi pe task_disputes (analiza AI pentru admin)
ALTER TABLE task_disputes
  ADD COLUMN IF NOT EXISTS ai_analysis    JSONB,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- ============================================================
-- Verificare: ar trebui să returneze tabelele/coloanele noi
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'task_ai_checklists' ORDER BY ordinal_position;
