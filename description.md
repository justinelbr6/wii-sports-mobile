# 🎮 Wii Sports Mobile — Récapitulatif projet pour Claude Code

## Vue d'ensemble

Projet scolaire : clone mobile de Wii Sports.
**URL GitHub Pages** : `https://justinelbr6.github.io/wii-sports-mobile`
**Stack** : HTML/CSS/JS vanilla + Three.js (3D) + Supabase (BDD) + sensors.js (gyroscope/swipe)
**Authentification** : domaines autorisés `@albertschool.com` / `@albertschool.fr` uniquement

---

## Structure des fichiers

```
wii-sports-mobile/
├── index.html          ← Menu principal (grille des 5 sports)
├── login.html          ← Connexion
├── inscription.html    ← Inscription + création Mii (SVG)
├── profil.html         ← Profil joueur + records personnels
├── classements.html    ← Classements globaux par sport
├── bowling.html
├── boxe.html
├── baseball.html
├── golf.html
├── tennis.html
├── js/
│   ├── supabase.js     ← Client Supabase + fonctions auth/BDD partagées
│   └── sensors.js      ← Gyroscope + SwipeDetector
└── assets/             ← Images, logos
```

---

## Base de données Supabase

**URL** : `https://jkfktjvloclwfzcgudyg.supabase.co`
**Clé anon** : dans `js/supabase.js`

### Table `profiles`
Créée automatiquement via trigger à l'inscription.

| Colonne | Type | Description |
|---|---|---|
| id | uuid (FK auth.users) | Identifiant unique |
| email | text | Email @albertschool |
| full_name | text | Nom complet |
| mii_color | text | Couleur tenue (#4FC3F7) |
| mii_hair | text | Coiffure (hair1/hair2/hair3) |
| mii_hair_color | text | Couleur cheveux (#4A2C0A) |
| xp_points | int | XP total |
| stats_wins | int | Victoires totales |
| stats_losses | int | Défaites totales |
| win_streak | int | Série de victoires en cours |
| onboarding_done | bool | Tutoriel vu |
| created_at | timestamptz | |

### Table `scores` — Deja crée a partir: (SQL dans `supabase-scores.sql`)

```sql
CREATE TABLE scores (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sport      text NOT NULL,  -- 'bowling','golf','boxe','baseball','tennis'
  score      int  NOT NULL,
  gagne      bool DEFAULT false,
  joue_le    timestamptz DEFAULT now()
);
```

**RLS activé** via `supabase-rls.sql` (déjà exécuté).

---

## Logique de score par sport

### 🎳 Bowling
- **10 frames** officielles (frame 10 spéciale : jusqu'à 3 lancers)
- Strike = 10 + 2 prochains lancers
- Spare = 10 + prochain lancer
- **Score sauvegardé** : score officiel total (max ~300)
- **Métrique classement** : **score maximum** atteint en une partie

### ⛳ Golf
- **3 trous** (terrain 1, 2, 3)
- Le joueur lance la balle via gyroscope
- **Score sauvegardé** : nombre total de coups pour compléter les 3 trous
- **Métrique classement** : **minimum de coups** (plus bas = meilleur, comme au vrai golf)

### 🥊 Boxe
- Mode survie infini, rounds qui s'enchaînent
- Esquiver (gyroscope) + contre-attaquer (bouton doré)
- 3 vies, combos qui multiplient le score
- **Score sauvegardé** : score maximum atteint avant K.O.
- **Métrique classement** : **score maximum**

### ⚾ Baseball
- Mode survie, 3 vies
- Frapper la balle avec timing sur barre coulissante
- Parfait = +100 pts, Bon = +50 pts, combo multiplie
- **Score sauvegardé** : score total (coups réussis × multiplicateur combo)
- **Métrique classement** : **score maximum**

### 🎾 Tennis
- Match 2v2, 3 jeux pour gagner
- Le joueur incline le téléphone pour diriger ses tirs
- **Score sauvegardé** : victoire (+1) ou défaite (0) a nombre de victoire
- **Métrique classement** : **nombre total de victoires**

---

## Fonctions partagées dans `js/supabase.js`

```javascript
checkAuth()              // Redirige vers login.html si non connecté
getProfilCourant()       // Retourne le profil de l'utilisateur connecté
getAdversaire(sport)     // Retourne un joueur aléatoire comme adversaire CPU
sauvegarderFinPartie(sport, { score, gagne })  // Insère dans scores + maj stats
```

---

## Ce qui est FAIT ✅

- Auth complète (inscription email → confirmation → login)
- Mii SVG personnalisable (coiffure, couleur tenue, couleur cheveux) / il faut refaire la visualisation/
- Page d'accueil avec les 5 sports
- Bowling : 10 frames officielles, calcul strike/spare, page tuto illustrée
- Boxe : page tuto illustrée (sans sélection de niveau)
- Baseball : page tuto illustrée + sauvegarde localStorage
- RLS Supabase activé (`supabase-rls.sql`)
- Page classements (structure tabs par sport, podium top 3)
- Page profil (structure records par sport)

## Ce qui est EN COURS / À FAIRE ❌


### 1. Brancher `sauvegarderFinPartie` dans tous les jeux, pour relier les scores des joueurs a leur base de donée
La fonction existe dans `supabase.js` mais n'est pas encore appelée proprement dans golf et tennis. Bowling et baseball ont l'appel en place.

### 2. Classements — lire les vrais scores Supabase
**Fichier** : `classements.html`
Actuellement la page a la structure (tabs, podium, carte "mon rang") mais les données sont statiques/mockées.

**À faire** : Pour chaque sport, requête Supabase :
```javascript
// Bowling, Boxe, Baseball → MAX(score) par joueur
supabaseClient.from('scores')
  .select('user_id, profiles(full_name, mii_color), score')
  .eq('sport', 'bowling')
  .order('score', { ascending: false })
  .limit(20)

// Golf → MIN(score) par joueur (moins de coups = mieux)
supabaseClient.from('scores')
  .select('user_id, profiles(full_name, mii_color), score')
  .eq('sport', 'golf')
  .order('score', { ascending: true })   // ← ascendant !
  .limit(20)

// Tennis → COUNT des victoires par joueur
supabaseClient.from('scores')
  .select('user_id, profiles(full_name, mii_color)')
  .eq('sport', 'tennis')
  .eq('gagne', true)
  // puis grouper côté JS ou via une vue SQL
```

### 3. Profil — lire les records personnels depuis Supabase
**Fichier** : `profil.html`
La structure HTML est là (ids : `score-bowling`, `score-golf`, `score-tennis`, `score-boxe`, `score-baseball`).
Il faut une fonction `getStatsProfil()` dans `supabase.js` qui récupère :
- Bowling : `MAX(score)` WHERE sport='bowling' AND user_id=moi
- Golf : `MIN(score)` WHERE sport='golf' AND user_id=moi
- Boxe : `MAX(score)` WHERE sport='boxe' AND user_id=moi
- Baseball : `MAX(score)` WHERE sport='baseball' AND user_id=moi
- Tennis : `COUNT(*)` WHERE sport='tennis' AND gagne=true AND user_id=moi

### 4. Golf — bugs + gyroscope 3 trous
Le golf existe mais a des bugs de physique et le gyroscope n'est pas bien calibré. À revoir séparément.

### 5. Miis plus ressemblants
Les Miis en jeu (Three.js) sont des formes géométriques basiques. L'idée est de les rendre plus fidèles au style Wii : tête plus grosse et ronde, traits du visage visibles (yeux, sourcils, bouche), corps proportionné. Le Mii du joueur doit refléter les choix faits à l'inscription (couleur tenue, coiffure, couleur cheveux). Les données sont dans `profiles.mii_color`, `profiles.mii_hair`, `profiles.mii_hair_color`.

### 6. Integration Image et son
On a des sons a faire jouer lors de la creation du mii et lorsque la page index est ouverte 
Et des image a mettre dans la page index

---

## Fichiers à déployer (outputs de cette session)

| Fichier | Statut |
|---|---|
| `bowling.html` | ✅ Revu (10 frames, tuto, Supabase) |
| `boxe.html` | ✅ Revu (tuto illustré) |
| `baseball.html` | ✅ Revu (tuto illustré, sauvegarde score) |
| `supabase-rls.sql` | ✅ À exécuter dans Supabase SQL Editor |
| `golf.html` | ⏳ Pas encore revu |
| `tennis.html` | ⏳ Pas encore revu |
| `classements.html` | ⏳ Structure OK, données à brancher |
| `profil.html` | ⏳ Structure OK, données à brancher |
| `js/supabase.js` | ⏳ Fonction `getStatsProfil()` à ajouter |