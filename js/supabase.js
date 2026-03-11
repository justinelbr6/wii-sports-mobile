// ============================================================
//  supabase.js — Wii Sports Mobile
// ============================================================

const SUPABASE_URL = 'https://jkfktjvloclwfzcgudyg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZmt0anZsb2Nsd2Z6Y2d1ZHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjAyNzksImV4cCI6MjA4ODM5NjI3OX0.Lox72iQ5lTfR9hZK3vArz8KPo7MsftciMP9ifwxaP9w';

const { createClient } = supabase;
const supabaseClient   = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── AUTH ──────────────────────────────────────────────────────
async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) window.location.replace('login.html');
  return session;
}

async function getProfilCourant() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabaseClient
    .from('profiles').select('*').eq('id', user.id).single();
  if (error) { console.error('getProfilCourant:', error.message); return null; }
  return data;
}

async function seDeconnecter() {
  await supabaseClient.auth.signOut();
  window.location.replace('login.html');
}

// ── ADVERSAIRES ───────────────────────────────────────────────
async function getAdversaire(sport, niveau = null) {
  try {
    const colonne = {
      tennis:'level_tennis', baseball:'level_baseball',
      bowling:'level_bowling', boxe:'level_boxe', golf:'level_golf',
    }[sport];

    let query = supabaseClient.from('profiles').select('id, full_name, email');

    if (niveau && colonne) {
      const niveauEnum = {
        'facile':'Débutant','moyen':'Intermédiaire','difficile':'Confirmé',
        'Débutant':'Débutant','Intermédiaire':'Intermédiaire','Confirmé':'Confirmé',
      }[niveau] || niveau;
      query = query.eq(colonne, niveauEnum);
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) query = query.neq('id', user.id);

    const { data, error } = await query;
    if (error) { console.error('getAdversaire:', error.message); return null; }
    if (!data || data.length === 0) return { nom: 'CPU', avatar: '🤖' };

    const adv = data[Math.floor(Math.random() * data.length)];
    return { nom: adv.full_name, avatar: '🎮', email: adv.email, id: adv.id };
  } catch (err) {
    console.error('getAdversaire:', err);
    return { nom: 'CPU', avatar: '🤖' };
  }
}

async function getJoueursParNiveau(sport, niveau) {
  const colonne = {
    tennis:'level_tennis', baseball:'level_baseball',
    bowling:'level_bowling', boxe:'level_boxe', golf:'level_golf',
  }[sport];
  if (!colonne) return [];
  const { data, error } = await supabaseClient
    .from('profiles').select('id, full_name, email')
    .eq(colonne, niveau).order('full_name', { ascending: true });
  if (error) return [];
  return data || [];
}

// ── MEILLEUR SCORE PERSO ──────────────────────────────────────
async function getMeilleurScore(sport) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabaseClient
      .from('classement')
      .select('score, gagne, joue_le')
      .eq('user_id', user.id)
      .eq('sport', sport)
      .order('score', { ascending: sport === 'golf' })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch(err) { return null; }
}

// ── SAUVEGARDE FIN DE PARTIE ──────────────────────────────────
//  Règles :
//    bowling  → MAX quilles (0-300)
//    golf     → MIN coups (moins = mieux)
//    tennis   → MAX balles renvoyées
//    boxe     → MAX points
//    baseball → MAX points
//
//  N'insère dans classement QUE si nouveau record perso.
//  Les stats profil (wins/XP) sont TOUJOURS mises à jour.
// ─────────────────────────────────────────────────────────────
async function sauvegarderFinPartie(sport, { score = 0, gagne = false } = {}) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { console.warn('sauvegarderFinPartie: utilisateur non connecté'); return; }

    // ── Nouveau record ? ──
    const meilleur = await getMeilleurScore(sport);
    const estRecord = !meilleur ||
      (sport === 'golf' ? score < meilleur.score : score > meilleur.score);

    // ── Calcul XP ──
    let xp_gagne = 10;
    if (gagne) {
      switch (sport) {
        case 'bowling':  xp_gagne = Math.min(150, 50 + Math.floor(score / 5));      break;
        case 'golf':     xp_gagne = Math.min(150, 50 + Math.max(0, 30 - score));    break;
        case 'tennis':   xp_gagne = Math.min(150, 50 + Math.floor(score / 2));      break;
        case 'boxe':
        case 'baseball': xp_gagne = Math.min(150, 50 + Math.floor(score / 20));     break;
        default:         xp_gagne = Math.min(150, 50 + Math.floor(score / 10));
      }
    }

    // ── 1. Classement : seulement si record ──
    if (estRecord) {
      const { error: errScore } = await supabaseClient.from('classement').insert([{
        user_id: user.id,
        sport,
        score,
        gagne,
        xp_gagne,
        joue_le: new Date().toISOString(),
      }]);
      if (errScore) {
        console.error('❌ classement insert error:', errScore.message);
      } else {
        console.log(`🏆 Nouveau record ${sport} : ${score}`);
      }
    } else {
      console.log(`ℹ️ Pas un record (${sport}: ${score} — record actuel: ${meilleur.score})`);
    }

    // ── 2. Stats profil : toujours ──
    const { error: errRpc } = await supabaseClient.rpc('mettre_a_jour_stats', {
      p_user_id: user.id, p_gagne: gagne, p_xp: xp_gagne,
    });

    if (errRpc) {
      console.warn('RPC non dispo, fallback manuel:', errRpc.message);
      const { data: profil } = await supabaseClient
        .from('profiles').select('stats_wins,stats_losses,win_streak,loss_streak,xp_points')
        .eq('id', user.id).single();
      if (profil) {
        await supabaseClient.from('profiles').update(gagne ? {
          stats_wins:   (profil.stats_wins   || 0) + 1,
          win_streak:   (profil.win_streak   || 0) + 1,
          loss_streak:  0,
          xp_points:    (profil.xp_points    || 0) + xp_gagne,
          updated_at:   new Date().toISOString(),
        } : {
          stats_losses: (profil.stats_losses || 0) + 1,
          loss_streak:  (profil.loss_streak  || 0) + 1,
          win_streak:   0,
          xp_points:    (profil.xp_points    || 0) + xp_gagne,
          updated_at:   new Date().toISOString(),
        }).eq('id', user.id);
      }
    }

    console.log(`✅ ${sport} | score:${score} | gagne:${gagne} | xp:+${xp_gagne} | record:${estRecord}`);
    return { xp_gagne, estRecord };

  } catch(err) {
    console.error('sauvegarderFinPartie inattendu:', err);
  }
}

// ── CLASSEMENT PAR SPORT ──────────────────────────────────────
async function getClassementSport(sport, limit = 20) {
  try {
    const { data, error } = await supabaseClient
      .from('classement')
      .select('score, gagne, joue_le, user_id, profiles(id, full_name)')
      .eq('sport', sport)
      .order('score', { ascending: sport === 'golf' })
      .limit(200);

    if (error) { console.error('getClassementSport:', error.message); return []; }

    // Garder seulement le meilleur score par joueur
    const vus = new Set();
    const meilleurs = [];
    for (const row of (data || [])) {
      if (vus.has(row.user_id)) continue;
      vus.add(row.user_id);
      meilleurs.push(row);
      if (meilleurs.length >= limit) break;
    }
    return meilleurs;
  } catch(err) { return []; }
}

// ── STATS PROFIL ──────────────────────────────────────────────
async function getStatsProfil() {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    // Récupérer tous les records de l'utilisateur dans la table classement
    const { data, error } = await supabaseClient
      .from('classement')
      .select('sport, score')
      .eq('user_id', user.id);

    if (error) { console.error('Erreur getStatsProfil:', error.message); return null; }

    const stats = {
      bowling: 0,
      golf: 0, // Pour le golf, le meilleur score est le plus bas
      tennis: 0,
      boxe: 0,
      baseball: 0,
      moyenne: 0
    };

    if (!data || data.length === 0) return stats;

    let totalScore = 0;
    let count = 0;

    // On extrait le meilleur score par sport
    data.forEach(row => {
       if (row.sport === 'golf') {
           if (stats.golf === 0 || row.score < stats.golf) stats.golf = row.score;
       } else {
           if (row.score > stats[row.sport]) stats[row.sport] = row.score;
       }
    });

    // Calcul de la moyenne globale des scores
    for (const key in stats) {
       if (key !== 'moyenne' && stats[key] !== 0) {
           totalScore += stats[key];
           count++;
       }
    }
    stats.moyenne = count > 0 ? Math.round(totalScore / count) : 0;

    return stats;
  } catch (err) {
    console.error('getStatsProfil:', err);
    return null;
  }
}

// Alias legacy
async function sauvegarderScore(sport, score) {
  return sauvegarderFinPartie(sport, { score, gagne: false });
}
async function getAdversaireParNiveau(sport, niveau) {
  return getAdversaire(sport, niveau);
}