// ============================================================
//  js/supabase.js — Wii Sports Mobile
//  Chargé en premier sur TOUTES les pages du projet
// ============================================================

// 🔑 Clé ANON publique — safe à exposer côté client
const SUPABASE_URL = 'https://jkfktjvloclwfzcgudyg.supabase.co';
const SUPABASE_KEY = 'REMPLACE_PAR_TA_CLE_ANON'; // ← Supabase > Settings > API > anon public

const { createClient } = supabase;
const supabaseClient   = createClient(SUPABASE_URL, SUPABASE_KEY);


// ============================================================
//  AUTH — GARDE : redirige vers login.html si non connecté
//  Appelle checkAuth() en haut de chaque page jeu/menu
//
//  Exemple dans index.html :
//    <script src="js/supabase.js"></script>
//    <script> checkAuth(); </script>
// ============================================================
async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.replace('login.html');
  }
  return session;
}


// ============================================================
//  AUTH — PROFIL COURANT
//  Retourne le profil Supabase de l'utilisateur connecté
// ============================================================
async function getProfilCourant() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) { console.error('getProfilCourant:', error.message); return null; }
  return data;
}


// ============================================================
//  AUTH — DÉCONNEXION
//  À appeler depuis un bouton "Se déconnecter"
// ============================================================
async function seDeconnecter() {
  await supabaseClient.auth.signOut();
  window.location.replace('login.html');
}


// ============================================================
//  ADVERSAIRES — Récupère un joueur aléatoire
//  Utilisation : const adv = await getAdversaire('bowling', 'Débutant');
// ============================================================
async function getAdversaire(sport, niveau = null) {
  try {
    // Mapping nom de sport → colonne profiles
    const colonne = {
      tennis:   'level_tennis',
      baseball: 'level_baseball',
      bowling:  'level_bowling',
      boxe:     'level_boxe',
    }[sport];

    let query = supabaseClient.from('profiles').select('id, full_name, email');

    if (niveau && colonne) {
      // Convertit 'facile/moyen/difficile' → valeurs ENUM si besoin
      const niveauEnum = {
        'facile':     'Débutant',
        'moyen':      'Intermédiaire',
        'difficile':  'Confirmé',
        'Débutant':   'Débutant',
        'Intermédiaire':'Intermédiaire',
        'Confirmé':   'Confirmé',
      }[niveau] || niveau;

      query = query.eq(colonne, niveauEnum);
    }

    // Exclure le joueur connecté
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) query = query.neq('id', user.id);

    const { data, error } = await query;

    if (error) { console.error('getAdversaire:', error.message); return null; }
    if (!data || data.length === 0) return { nom: 'CPU', avatar: '🤖' };

    const adv = data[Math.floor(Math.random() * data.length)];
    return {
      nom:    adv.full_name,
      avatar: '🎮',
      email:  adv.email,
      id:     adv.id,
    };

  } catch (err) {
    console.error('getAdversaire inattendu:', err);
    return { nom: 'CPU', avatar: '🤖' };
  }
}


// ============================================================
//  ADVERSAIRES — Liste par niveau pour un sport
// ============================================================
async function getJoueursParNiveau(sport, niveau) {
  const colonne = {
    tennis:'level_tennis', baseball:'level_baseball',
    bowling:'level_bowling', boxe:'level_boxe',
  }[sport];

  if (!colonne) return [];

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, full_name, email')
    .eq(colonne, niveau)
    .order('full_name', { ascending: true });

  if (error) { console.error('getJoueursParNiveau:', error.message); return []; }
  return data || [];
}


// ============================================================
//  SCORES — Sauvegarde un score de partie
// ============================================================
async function sauvegarderScore(sport, score) {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { error } = await supabaseClient.from('scores').insert([{
    user_id: user.id,
    sport:   sport,
    score:   score,
    joue_le: new Date().toISOString(),
  }]);

  if (error) console.error('sauvegarderScore:', error.message);
}