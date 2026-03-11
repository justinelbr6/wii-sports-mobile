// ============================================================
//  js/supabase.js — Wii Sports Mobile
//  Chargé en premier sur TOUTES les pages du projet
// ============================================================

const SUPABASE_URL = 'https://jkfktjvloclwfzcgudyg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZmt0anZsb2Nsd2Z6Y2d1ZHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjAyNzksImV4cCI6MjA4ODM5NjI3OX0.Lox72iQ5lTfR9hZK3vArz8KPo7MsftciMP9ifwxaP9w';

const { createClient } = supabase;
const supabaseClient   = createClient(SUPABASE_URL, SUPABASE_KEY);


// ============================================================
//  AUTH — GARDE
// ============================================================
async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) window.location.replace('login.html');
  return session;
}


// ============================================================
//  AUTH — PROFIL COURANT
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
// ============================================================
async function seDeconnecter() {
  await supabaseClient.auth.signOut();
  window.location.replace('login.html');
}


// ============================================================
//  MII — GÉNÉRATION SVG
//  Usage : genererMiiSVG('#4FC3F7', 'hair1', '#4A2C0A', 80, 96)
//  Retourne une string HTML <svg>...</svg> prête à injecter
// ============================================================
function genererMiiSVG(bodyColor, hairType, hairColor, width, height) {
  bodyColor = bodyColor || '#4FC3F7';
  hairType  = hairType  || 'hair1';
  hairColor = hairColor || '#4A2C0A';
  width     = width     || 80;
  height    = height    || 96;

  let hair = '';
  if (hairType === 'hair1') {
    hair = `
      <ellipse cx="50" cy="30" rx="24" ry="18" fill="${hairColor}"/>
      <rect x="26" y="30" width="48" height="10" fill="${hairColor}"/>`;
  } else if (hairType === 'hair2') {
    hair = `
      <ellipse cx="50" cy="28" rx="24" ry="18" fill="${hairColor}"/>
      <rect x="26" y="28" width="10" height="12" fill="${hairColor}"/>
      <rect x="64" y="28" width="10" height="12" fill="${hairColor}"/>
      <rect x="22" y="38" width="8" height="22" rx="4" fill="${hairColor}"/>
      <rect x="70" y="38" width="8" height="22" rx="4" fill="${hairColor}"/>`;
  } else {
    hair = `
      <circle cx="32" cy="28" r="10" fill="${hairColor}"/>
      <circle cx="50" cy="22" r="12" fill="${hairColor}"/>
      <circle cx="68" cy="28" r="10" fill="${hairColor}"/>
      <rect x="26" y="30" width="48" height="8" fill="${hairColor}"/>`;
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Corps -->
    <ellipse cx="50" cy="98" rx="26" ry="20" fill="${bodyColor}"/>
    <!-- Bras -->
    <ellipse cx="22" cy="90" rx="8" ry="6" fill="${bodyColor}" transform="rotate(-20,22,90)"/>
    <ellipse cx="78" cy="90" rx="8" ry="6" fill="${bodyColor}" transform="rotate(20,78,90)"/>
    <!-- Cou -->
    <rect x="44" y="65" width="12" height="10" rx="4" fill="#FFCBA4"/>
    <!-- Tête -->
    <ellipse cx="50" cy="52" rx="24" ry="26" fill="#FFCBA4"/>
    <!-- Oreilles -->
    <ellipse cx="26" cy="54" rx="5" ry="7" fill="#FFCBA4"/>
    <ellipse cx="74" cy="54" rx="5" ry="7" fill="#FFCBA4"/>
    <!-- Cheveux -->
    ${hair}
    <!-- Yeux -->
    <ellipse cx="40" cy="50" rx="5" ry="6" fill="white"/>
    <ellipse cx="60" cy="50" rx="5" ry="6" fill="white"/>
    <circle cx="41" cy="51" r="3" fill="#333"/>
    <circle cx="61" cy="51" r="3" fill="#333"/>
    <circle cx="42" cy="49.5" r="1" fill="white"/>
    <circle cx="62" cy="49.5" r="1" fill="white"/>
    <!-- Nez -->
    <ellipse cx="50" cy="58" rx="3" ry="2.5" fill="#F0A080"/>
    <!-- Sourire -->
    <path d="M43 64 Q50 70 57 64" stroke="#C07050" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- Joues -->
    <ellipse cx="34" cy="60" rx="5" ry="3.5" fill="rgba(255,150,150,0.3)"/>
    <ellipse cx="66" cy="60" rx="5" ry="3.5" fill="rgba(255,150,150,0.3)"/>
  </svg>`;
}


// ============================================================
//  MII — INJECTER DANS UN ÉLÉMENT DOM
//  Usage : injecterMiiDansElement('mon-div-id', profil)
// ============================================================
function injecterMiiDansElement(elementId, profil) {
  const el = document.getElementById(elementId);
  if (!el || !profil) return;
  el.innerHTML = genererMiiSVG(
    profil.mii_color     || '#4FC3F7',
    profil.mii_hair      || 'hair1',
    profil.mii_hair_color|| '#4A2C0A',
    60, 72
  );
}


// ============================================================
//  ADVERSAIRES — Récupère un joueur aléatoire
// ============================================================
async function getAdversaire(sport, niveau = null) {
  try {
    const colonne = {
      tennis:   'level_tennis',
      baseball: 'level_baseball',
      bowling:  'level_bowling',
      boxe:     'level_boxe',
    }[sport];

    let query = supabaseClient.from('profiles')
      .select('id, full_name, email, mii_color, mii_hair, mii_hair_color');

    if (niveau && colonne) {
      const niveauEnum = {
        'facile':       'Débutant',
        'moyen':        'Intermédiaire',
        'difficile':    'Confirmé',
        'Débutant':     'Débutant',
        'Intermédiaire':'Intermédiaire',
        'Confirmé':     'Confirmé',
      }[niveau] || niveau;
      query = query.eq(colonne, niveauEnum);
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) query = query.neq('id', user.id);

    const { data, error } = await query;
    if (error) { console.error('getAdversaire:', error.message); return null; }
    if (!data || data.length === 0) return { nom: 'CPU', avatar: '🤖', mii_color:'#EF5350', mii_hair:'hair1', mii_hair_color:'#1A1A1A' };

    const adv = data[Math.floor(Math.random() * data.length)];
    return {
      nom:           adv.full_name,
      avatar:        '🎮',
      email:         adv.email,
      id:            adv.id,
      mii_color:     adv.mii_color     || '#EF5350',
      mii_hair:      adv.mii_hair      || 'hair1',
      mii_hair_color:adv.mii_hair_color|| '#1A1A1A',
    };

  } catch (err) {
    console.error('getAdversaire inattendu:', err);
    return { nom: 'CPU', avatar: '🤖', mii_color:'#EF5350', mii_hair:'hair1', mii_hair_color:'#1A1A1A' };
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
    .select('id, full_name, email, mii_color, mii_hair, mii_hair_color')
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