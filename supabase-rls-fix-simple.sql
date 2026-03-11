-- ✅ FIX RLS SIMPLE - Exécute ceci dans Supabase SQL Editor

-- Supprimer les policies existantes (qui bloquent)
DROP POLICY IF EXISTS "Lire tous les scores" ON scores;
DROP POLICY IF EXISTS "Insérer ses propres scores" ON scores;
DROP POLICY IF EXISTS "Mettre à jour ses propres scores" ON scores;
DROP POLICY IF EXISTS "Supprimer ses propres scores" ON scores;
DROP POLICY IF EXISTS "Users can read all scores" ON scores;
DROP POLICY IF EXISTS "Users can insert their own scores" ON scores;
DROP POLICY IF EXISTS "Users can update their own scores" ON scores;
DROP POLICY IF EXISTS "Users can delete their own scores" ON scores;

-- Créer les BONNES policies
CREATE POLICY "Lire tous les scores" ON scores
  FOR SELECT USING (true);

CREATE POLICY "Insérer ses propres scores" ON scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mettre à jour ses propres scores" ON scores
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Supprimer ses propres scores" ON scores
  FOR DELETE USING (auth.uid() = user_id);
