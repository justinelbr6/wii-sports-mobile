-- ✅ Ajouter champ gender à la table profiles
ALTER TABLE profiles ADD COLUMN gender TEXT DEFAULT 'man';

-- Comment: Valeurs: 'man' ou 'woman'
-- Utilisé pour afficher le bon sprite PNG du Mii
