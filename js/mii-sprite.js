// ============================================================
//  mii-sprite.js — Wii Sports Mobile
//  Affiche le Mii du joueur comme sprite 2D dans la scène 3D
//
//  UTILISATION :
//    <script src="../js/mii-sprite.js"></script>
//
//    // Récupère le genre depuis Supabase puis crée le sprite
//    const profil = await getProfilCourant();
//    const genre  = profil?.mii_gender || 'man'; // 'man' ou 'woman'
//    const mii    = createMiiSprite(scene, genre);
//
//  POSITION : ajuste mii.position.set(x, y, z) après création
//  TAILLE   : ajuste mii.scale.set(w, h, 1) après création
// ============================================================

function createMiiSprite(scene, gender = 'man', opts = {}) {

  const {
    x = 0,
    y = 1.5,
    z = 0,
    width  = 2.0,
    height = 3.2,
    // Chemin relatif depuis le HTML qui charge ce script
    basePath = '../assets/textures/',
  } = opts;

  const loader  = new THREE.TextureLoader();
  const imgPath = basePath + (gender === 'woman' ? 'mii_woman.png' : 'mii_man.png');

  const texture  = loader.load(imgPath);
  const material = new THREE.SpriteMaterial({
    map:         texture,
    transparent: true,
    alphaTest:   0.05,   // évite les artefacts de transparence
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width, height, 1);
  sprite.position.set(x, y, z);

  scene.add(sprite);
  return sprite;
}

// ── Variante : plusieurs Miis spectateurs ────────────────────
// Crée N sprites sur une ligne (utile pour les gradins)
function createMiiCrowd(scene, count = 8, opts = {}) {
  const {
    startX   = -4,
    spacing  = 1.1,
    y        = 1.2,
    z        = -5,
    width    = 1.0,
    height   = 1.6,
    basePath = '../assets/textures/',
  } = opts;

  const sprites = [];
  for (let i = 0; i < count; i++) {
    const gender  = Math.random() < 0.5 ? 'man' : 'woman';
    const sprite  = createMiiSprite(scene, gender, {
      x: startX + i * spacing,
      y,
      z,
      width,
      height,
      basePath,
    });
    sprites.push(sprite);
  }
  return sprites;
}