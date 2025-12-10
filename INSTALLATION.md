# Guide d'installation

## Prérequis

- Node.js 18 ou supérieur
- npm ou yarn
- Compte Supabase (gratuit)

## Étapes d'installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor**
3. Exécuter le contenu de `supabase-schema.sql`
4. Récupérer votre **URL** et **anon key** dans Settings > API

### 3. Configurer les variables d'environnement

Créer un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-anon-key
```

### 4. Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### 5. Build pour production

```bash
npm run build:pwa
```

Les fichiers seront dans le dossier `dist/`

## Structure des routes

- `/` - Page d'accueil
- `/login` - Connexion
- `/signup` - Inscription
- `/onboarding` - Configuration du commerce (première fois)
- `/dashboard` - Tableau de bord
- `/calendar` - Calendrier
- `/services` - Gestion des services
- `/appointments` - Liste des rendez-vous
- `/settings` - Paramètres
- `/:slug` - Page publique du commerce
- `/book/:slug` - Page de réservation publique

## Prochaines étapes

1. Configurer l'envoi d'emails (Supabase Edge Functions ou service externe)
2. Ajouter la gestion du staff (optionnel)
3. Implémenter les rappels automatiques
4. Configurer le stockage pour les logos

