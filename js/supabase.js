// ============================================
//  CONNEXION SUPABASE
//  Fichier : js/supabase.js
// ============================================

// 🔑 REMPLACE CES DEUX VALEURS PAR LES TIENNES
const SUPABASE_URL = 'https://jkfktjvloclwfzcgudyg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZmt0anZsb2Nsd2Z6Y2d1ZHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjAyNzksImV4cCI6MjA4ODM5NjI3OX0.Lox72iQ5lTfR9hZK3vArz8KPo7MsftciMP9ifwxaP9w';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getAdversaire(sport, niveau = null) {
  try {
    let query = supabaseClient.from('joueurs').select('*');
    if (niveau) query = query.eq(sport, niveau);
    const { data, error } = await query;
    if (error) { console.error('Erreur Supabase :', error.message); return null; }
    if (!data || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)];
  } catch (err) {
    console.error('Erreur :', err);
    return null;
  }
}