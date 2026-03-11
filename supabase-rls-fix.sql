-- ✅ FIX RLS pour classements.html

-- 1. Désactiver puis réactiver RLS pour table scores
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- 2. Lire TOUS les scores (pour classements.html)
CREATE POLICY "Lire tous les scores"
  ON scores FOR SELECT
  USING (true);

-- 3. Insérer ses propres scores
CREATE POLICY "Insérer ses propres scores"
  ON scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Mettre à jour ses propres scores
CREATE POLICY "Mettre à jour ses propres scores"
  ON scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Supprimer ses propres scores
CREATE POLICY "Supprimer ses propres scores"
  ON scores FOR DELETE
  USING (auth.uid() = user_id);
