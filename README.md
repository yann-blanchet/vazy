# Vazy - Système de réservation en ligne

Application PWA pour la gestion de rendez-vous en ligne pour commerces (coiffeurs, barbiers, esthéticiens).

## 🚀 Technologies

- **Vue 3** - Framework JavaScript
- **Quasar Framework** - UI Framework
- **Vite** - Build tool
- **Pinia** - State management
- **Supabase** - Backend (Auth, Database, Storage)
- **Dexie.js** - Offline-first database
- **Day.js** - Date utilities

## 📋 Fonctionnalités

### 1. Business Onboarding
- Création de compte (email/password)
- Configuration du commerce (nom, adresse, horaires)
- Génération d'URL publique (slug)
- Gestion des services

### 2. Services
- Création et gestion des services
- Durée et prix
- Visibilité en ligne
- Description optionnelle

### 3. Calendrier & Disponibilités
- Vue jour/semaine
- Gestion des créneaux disponibles
- Pauses et jours de fermeture
- Blocage de périodes

### 4. Flux de réservation client
- Page publique de réservation
- Sélection de service
- Choix date/heure
- Formulaire client
- Confirmation par email

### 5. Back-office
- Dashboard avec statistiques
- Calendrier des rendez-vous
- Gestion des appointments
- Liste des clients
- Gestion des services

### 6. Notifications
- Email de confirmation (business)
- Email de confirmation (client)
- Rappels optionnels

### 7. Page publique
- Logo et description
- Liste des services
- Horaires d'ouverture
- Bouton "Réserver"

## 🛠️ Installation

### Prérequis
- Node.js 18+
- Compte Supabase

### Setup

1. **Cloner et installer les dépendances**
```bash
npm install
```

2. **Configurer Supabase**
- Créer un projet Supabase
- Exécuter `supabase-schema.sql` dans SQL Editor
- Récupérer URL et anon key

3. **Configurer les variables d'environnement**
Créer un fichier `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. **Lancer le serveur de développement**
```bash
npm run dev
```

5. **Build pour production**
```bash
npm run build:pwa
```

## 📁 Structure du projet

```
src/
├── stores/          # Pinia stores
│   ├── auth.js
│   ├── business.js
│   ├── services.js
│   └── appointments.js
├── services/        # Services (Supabase, DB, Sync)
│   ├── supabase.js
│   ├── db.js
│   └── sync.js
├── views/           # Pages Vue
│   ├── auth/
│   ├── onboarding/
│   ├── dashboard/
│   ├── calendar/
│   ├── services/
│   └── public/
├── router/          # Vue Router
└── layouts/         # Layouts Quasar
```

## 🗄️ Base de données

Le schéma Supabase inclut:
- `businesses` - Informations des commerces
- `services` - Services proposés
- `appointments` - Rendez-vous
- `availability` - Disponibilités et blocages
- `customers` - Clients (optionnel)

## 🔒 Sécurité

- Row Level Security (RLS) activé
- Politiques de sécurité par table
- Authentification via Supabase Auth
- Tokens de cancellation pour annulations

## 📱 PWA

L'application est configurée comme PWA:
- Service Worker
- Manifest
- Offline-first avec Dexie
- Sync automatique quand en ligne

## 🚧 À compléter

- [ ] Vue calendrier complète (jour/semaine)
- [ ] Gestion des disponibilités avancée
- [ ] Envoi d'emails (Supabase Edge Functions ou service externe)
- [ ] Gestion du staff (optionnel)
- [ ] Rappels automatiques
- [ ] Statistiques avancées
- [ ] Upload de logo
- [ ] SMS notifications (optionnel)

## 📝 License

MIT

