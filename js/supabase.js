// ============================================================
//  js/supabase.js — Wii Sports Mobile
//  Chargé en premier sur TOUTES les pages du projet
// ============================================================

// 🔑 Clé ANON publique — safe à exposer côté client
const SUPABASE_URL = 'https://jkfktjvloclwfzcgudyg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZmt0anZsb2Nsd2Z6Y2d1ZHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjAyNzksImV4cCI6MjA4ODM5NjI3OX0.Lox72iQ5lTfR9hZK3vArz8KPo7MsftciMP9ifwxaP9w'; // ← Supabase > Settings > API > anon public

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
//  SCORES — Sauvegarde fin de partie + mise à jour stats profil
//
//  Utilisation :
//    await sauvegarderFinPartie('bowling', { score: 145, gagne: true });
//
//  XP attribuée automatiquement :
//    Victoire  : 50 XP + bonus selon score
//    Défaite   : 10 XP (consolation)
// ============================================================
async function sauvegarderFinPartie(sport, { score = 0, gagne = false } = {}) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Calcul XP
    const xp_gagne = gagne ? 50 + Math.floor(score / 10) : 10;

    // 1. Insérer dans la table scores
    const { error: errScore } = await supabaseClient.from('scores').insert([{
      user_id:  user.id,
      sport,
      score,
      gagne,
      xp_gagne,
      joue_le:  new Date().toISOString(),
    }]);
    if (errScore) console.error('sauvegarderFinPartie/scores:', errScore.message);

    // 2. Appeler la fonction SQL qui met à jour profiles
    const { error: errStats } = await supabaseClient.rpc('mettre_a_jour_stats', {
      p_user_id: user.id,
      p_gagne:   gagne,
      p_xp:      xp_gagne,
    });
    if (errStats) {
      // Fallback manuel si la fonction RPC n'existe pas encore
      console.warn('RPC non dispo, fallback manuel:', errStats.message);
      const { data: profil } = await supabaseClient
        .from('profiles').select('stats_wins,stats_losses,win_streak,loss_streak,xp_points')
        .eq('id', user.id).single();
      if (profil) {
        await supabaseClient.from('profiles').update(gagne ? {
          stats_wins:  (profil.stats_wins  || 0) + 1,
          win_streak:  (profil.win_streak  || 0) + 1,
          loss_streak: 0,
          xp_points:   (profil.xp_points   || 0) + xp_gagne,
        } : {
          stats_losses: (profil.stats_losses || 0) + 1,
          loss_streak:  (profil.loss_streak  || 0) + 1,
          win_streak:   0,
          xp_points:    (profil.xp_points    || 0) + xp_gagne,
        }).eq('id', user.id);
      }
    }

    console.log(`✅ Fin de partie sauvegardée — ${sport} | score:${score} | gagne:${gagne} | xp:+${xp_gagne}`);
    return { xp_gagne };

  } catch(err) {
    console.error('sauvegarderFinPartie inattendu:', err);
  }
}

// Alias legacy
async function sauvegarderScore(sport, score) {
  return sauvegarderFinPartie(sport, { score, gagne: false });
}