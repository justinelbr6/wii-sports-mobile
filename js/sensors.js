// ============================================
//  CAPTEURS DU SMARTPHONE
//  Fichier : js/sensors.js
//
//  Ce fichier gère 3 capteurs :
//  1. Gyroscope  → incliner le téléphone
//  2. Tactile    → swipe sur l'écran
//  3. Microphone → crier pour la boxe
// ============================================


// ============================================
//  1. GYROSCOPE
//  Donne l'inclinaison du téléphone
//
//  Utilisation :
//  const gyro = new Gyroscope();
//  gyro.start();
//  console.log(gyro.x); // inclinaison gauche/droite (-90 à 90)
//  console.log(gyro.y); // inclinaison avant/arrière (-90 à 90)
// ============================================

class Gyroscope {
    constructor() {
      this.x = 0; // gauche / droite
      this.y = 0; // avant / arrière
      this.z = 0; // rotation
      this.actif = false;
      this._handler = this._onMove.bind(this);
    }
  
    // Démarre le gyroscope
    async start() {
      // Sur iOS, il faut demander la permission explicitement
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission !== 'granted') {
            console.warn('Permission gyroscope refusée');
            return false;
          }
        } catch (e) {
          console.error('Erreur permission gyroscope :', e);
          return false;
        }
      }
  
      window.addEventListener('deviceorientation', this._handler);
      this.actif = true;
      console.log('✅ Gyroscope activé');
      return true;
    }
  
    // Arrête le gyroscope
    stop() {
      window.removeEventListener('deviceorientation', this._handler);
      this.actif = false;
      this.x = 0;
      this.y = 0;
      this.z = 0;
    }
  
    // Mise à jour des valeurs à chaque mouvement
    _onMove(event) {
      // gamma = inclinaison gauche/droite (-90 à 90)
      // beta  = inclinaison avant/arrière (-180 à 180)
      // alpha = rotation horizontale (0 à 360)
      this.x = event.gamma || 0; // gauche / droite
      this.y = event.beta  || 0; // avant / arrière
      this.z = event.alpha || 0; // rotation
    }
  
    // Retourne une valeur normalisée entre -1 et 1
    // Pratique pour bouger un objet dans le jeu
    getNormalizedX(maxAngle = 30) {
      return Math.max(-1, Math.min(1, this.x / maxAngle));
    }
  
    getNormalizedY(maxAngle = 30) {
      return Math.max(-1, Math.min(1, this.y / maxAngle));
    }
  }
  
  
  // ============================================
  //  2. SWIPE TACTILE
  //  Détecte les gestes sur l'écran
  //
  //  Utilisation :
  //  const swipe = new SwipeDetector(monElement);
  //  swipe.onSwipe = (direction, puissance) => {
  //    console.log(direction);  // "haut", "bas", "gauche", "droite"
  //    console.log(puissance);  // 0 à 100
  //  };
  // ============================================
  
  class SwipeDetector {
    constructor(element = document.body) {
      this.element = element;
      this.onSwipe = null;    // callback appelé quand swipe détecté
      this.onTap = null;      // callback appelé quand simple tap
  
      this._startX = 0;
      this._startY = 0;
      this._startTime = 0;
  
      this._bindEvents();
    }
  
    _bindEvents() {
      this.element.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        this._startX = touch.clientX;
        this._startY = touch.clientY;
        this._startTime = Date.now();
      }, { passive: true });
  
      this.element.addEventListener('touchend', (e) => {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - this._startX;
        const dy = touch.clientY - this._startY;
        const dt = Date.now() - this._startTime;
  
        const distance = Math.sqrt(dx * dx + dy * dy);
  
        // Si la distance est trop petite → c'est un tap, pas un swipe
        if (distance < 20) {
          if (this.onTap) this.onTap();
          return;
        }
  
        // Calcule la puissance du swipe (0 à 100)
        // Plus le swipe est rapide et long, plus c'est puissant
        const vitesse = distance / dt; // pixels par milliseconde
        const puissance = Math.min(100, Math.round(vitesse * 200));
  
        // Détermine la direction principale
        let direction;
        if (Math.abs(dx) > Math.abs(dy)) {
          direction = dx > 0 ? 'droite' : 'gauche';
        } else {
          direction = dy > 0 ? 'bas' : 'haut';
        }
  
        console.log(`👆 Swipe ${direction} — puissance : ${puissance}`);
  
        if (this.onSwipe) this.onSwipe(direction, puissance);
      }, { passive: true });
    }
  
    // Arrête la détection
    destroy() {
      this.element.removeEventListener('touchstart', this._bindEvents);
      this.element.removeEventListener('touchend', this._bindEvents);
    }
  }
  
  
  // ============================================
  //  3. MICROPHONE
  //  Mesure le volume de la voix en temps réel
  //  Utilisé dans la boxe pour la puissance du coup
  //
  //  Utilisation :
  //  const micro = new Microphone();
  //  await micro.start();
  //  console.log(micro.volume); // 0 à 100
  //
  //  micro.onCri = (puissance) => {
  //    console.log('CRI détecté ! puissance :', puissance);
  //  };
  // ============================================
  
  class Microphone {
    constructor() {
      this.volume = 0;      // volume actuel (0 à 100)
      this.actif = false;
      this.onCri = null;    // callback quand cri détecté
  
      this._context = null;
      this._analyser = null;
      this._source = null;
      this._stream = null;
      this._animFrame = null;
  
      // Seuil à partir duquel on considère que c'est un cri
      this.seuilCri = 60;
    }
  
    // Démarre le microphone
    async start() {
      try {
        this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this._context = new (window.AudioContext || window.webkitAudioContext)();
        this._analyser = this._context.createAnalyser();
        this._analyser.fftSize = 256;
        this._source = this._context.createMediaStreamSource(this._stream);
        this._source.connect(this._analyser);
  
        this.actif = true;
        this._loop();
        console.log('✅ Microphone activé');
        return true;
      } catch (e) {
        console.error('❌ Erreur microphone :', e);
        return false;
      }
    }
  
    // Arrête le microphone
    stop() {
      this.actif = false;
      if (this._animFrame) cancelAnimationFrame(this._animFrame);
      if (this._stream) this._stream.getTracks().forEach(t => t.stop());
      if (this._context) this._context.close();
      this.volume = 0;
    }
  
    // Boucle de mesure du volume
    _loop() {
      if (!this.actif) return;
  
      const buffer = new Uint8Array(this._analyser.frequencyBinCount);
      this._analyser.getByteFrequencyData(buffer);
  
      // Calcule la moyenne du volume
      const moyenne = buffer.reduce((a, b) => a + b, 0) / buffer.length;
      this.volume = Math.round((moyenne / 255) * 100);
  
      // Détecte un cri
      if (this.volume >= this.seuilCri && this.onCri) {
        this.onCri(this.volume);
      }
  
      this._animFrame = requestAnimationFrame(() => this._loop());
    }
  }
  
  
  // ============================================
  //  BOUTON PERMISSION IOS
  //  Sur iPhone, il faut un bouton pour
  //  demander la permission du gyroscope
  //
  //  Utilisation :
  //  demanderPermissionIOS(() => {
  //    // Le joueur a accepté, on peut démarrer
  //    gyro.start();
  //  });
  // ============================================
  
  function demanderPermissionIOS(callback) {
    const estIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const besoinPermission = typeof DeviceOrientationEvent !== 'undefined' &&
                             typeof DeviceOrientationEvent.requestPermission === 'function';
  
    if (estIOS && besoinPermission) {
      // Crée un bouton "Jouer" qui demande la permission
      const btn = document.createElement('button');
      btn.textContent = '🎮 Appuie pour jouer !';
      btn.style.cssText = `
        position: fixed; inset: 0; margin: auto;
        width: 200px; height: 60px;
        background: #2A5FBF; color: white;
        font-size: 1.2rem; font-family: 'Fredoka One', cursive;
        border: none; border-radius: 16px;
        box-shadow: 0 6px 0 #1a3f8f;
        cursor: pointer; z-index: 9999;
      `;
      document.body.appendChild(btn);
  
      btn.addEventListener('click', async () => {
        const permission = await DeviceOrientationEvent.requestPermission();
        btn.remove();
        if (permission === 'granted') callback();
      });
    } else {
      // Android ou desktop → pas besoin de permission
      callback();
    }
  }