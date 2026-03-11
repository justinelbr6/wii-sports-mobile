// ============================================================
//  mii-renderer.js — Unified Mii Rendering System
// ============================================================
//  Converts stored Mii data (color, hair, gender) into:
//  - Canvas element (for HTML display)
//  - THREE.Sprite (for game scenes)
//  - Image URL (for <img> tags)

const MII_RENDERER = (() => {
  const cache = {}; // Cache recolored images to avoid repeated processing

  // ── Get base path for assets (works for both root and subdirectories) ──
  function getBasePath() {
    const scripts = document.querySelectorAll('script[src*="mii-renderer"]');
    if (scripts.length > 0) {
      const src = scripts[0].src;
      // Check if we're in /scenes/ subdirectory
      if (src.includes('/scenes/')) {
        return '../assets/textures/'; // From /scenes/
      }
    }
    // Default for root level
    return './assets/textures/';
  }

  const basePath = getBasePath();

  // ── Helper: Convert hex color to RGB ──
  function hexToRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ];
  }

  // ── Main Function: Recolor PNG sprite based on outfit and hair color ──
  async function recolorMii(spriteUrl, outfitHex, hairHex) {
    // Create cache key
    const cacheKey = spriteUrl + '|' + outfitHex + '|' + hairHex;
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Create offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Draw image
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Get target colors from hex
        const [or, og, ob] = hexToRgb(outfitHex);
        const [hr, hg, hb] = hexToRgb(hairHex);

        // Reference source colors (from mii_man.png / mii_woman.png)
        // Outfit: orange satur
        const SRC_OUT_R = 230, SRC_OUT_G = 90, SRC_OUT_B = 45;
        // Hair: brown/dark
        const SRC_HAIR_R = 139, SRC_HAIR_G = 86, SRC_HAIR_B = 49;

        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];

          // Skip transparent pixels
          if (a < 30) continue;

          // Calculate saturation
          const mx = Math.max(r, g, b);
          const mn = Math.min(r, g, b);
          const sat = mx > 0 ? (mx - mn) / mx : 0;

          // ── OUTFIT: orange saturé, rouge domine ──
          const isOutfit = (r > 160) && (g < r * 0.56) && (b < r * 0.42) &&
                          (sat > 0.38) && (mx === r);

          // ── HAIR: brown/dark, low saturation ──
          const isHair = !isOutfit && (r > 100) && (g < r * 0.7) && (b < r * 0.6) &&
                        (sat > 0.08) && (sat < 0.45);

          // Apply recoloring while preserving luminosity
          if (isOutfit) {
            const lum = r / SRC_OUT_R;
            data[i] = Math.min(255, Math.round(or * lum));
            data[i + 1] = Math.min(255, Math.round(og * lum));
            data[i + 2] = Math.min(255, Math.round(ob * lum));
          } else if (isHair) {
            const lum = r / SRC_HAIR_R;
            data[i] = Math.min(255, Math.round(hr * lum));
            data[i + 1] = Math.min(255, Math.round(hg * lum));
            data[i + 2] = Math.min(255, Math.round(hb * lum));
          }
        }

        // Put recolored data back
        ctx.putImageData(imageData, 0, 0);

        // Cache and resolve
        cache[cacheKey] = canvas;
        resolve(canvas);
      };

      img.onerror = () => {
        console.error('❌ Erreur chargement sprite Mii:', spriteUrl);
        console.error('   Vérifiez que le fichier PNG existe au chemin:', spriteUrl);
        console.error('   URL complète:', new URL(spriteUrl, window.location.href).href);
        resolve(null);
      };

      img.src = spriteUrl;
    });
  }

  // ── Create Canvas Element for HTML Display ──
  async function createMiiCanvas(miiData, gender = 'man', size = 200) {
    if (!miiData || !miiData.mii_color || !miiData.mii_hair_color) {
      console.warn('⚠️ Mii data incomplete:', miiData);
      return null;
    }

    const filename = gender === 'woman' ? 'mii_woman.png' : 'mii_man.png';
    const spriteUrl = basePath + filename;

    console.log('📦 Loading Mii sprite from:', spriteUrl);

    const recoloredCanvas = await recolorMii(spriteUrl, miiData.mii_color, miiData.mii_hair_color);

    if (!recoloredCanvas) return null;

    // Create display canvas with target size
    const displayCanvas = document.createElement('canvas');
    displayCanvas.width = size;
    displayCanvas.height = size;
    const ctx = displayCanvas.getContext('2d');

    // Scale and draw recolored sprite
    ctx.drawImage(recoloredCanvas, 0, 0, size, size);

    return displayCanvas;
  }

  // ── Create THREE.Sprite for Games ──
  async function createMiiSprite(scene, miiData, gender = 'man', scale = 1) {
    if (!miiData || !miiData.mii_color || !miiData.mii_hair_color) {
      console.warn('⚠️ Mii data incomplete for sprite');
      return null;
    }

    const filename = gender === 'woman' ? 'mii_woman.png' : 'mii_man.png';
    const spriteUrl = basePath + filename;

    console.log('🎮 Loading Mii sprite for game:', spriteUrl);

    const recoloredCanvas = await recolorMii(spriteUrl, miiData.mii_color, miiData.mii_hair_color);

    if (!recoloredCanvas) return null;

    // Create THREE.Texture from canvas
    const texture = new THREE.CanvasTexture(recoloredCanvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    // Create sprite material and sprite
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale, scale, 1);

    if (scene) scene.add(sprite);

    return sprite;
  }

  // ── Get Image URL (for <img> tags) ──
  async function getMiiImageUrl(miiData, gender = 'man') {
    const canvas = await createMiiCanvas(miiData, gender, 200);
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  }

  // Public API
  return {
    createMiiCanvas,
    createMiiSprite,
    getMiiImageUrl
  };
})();
