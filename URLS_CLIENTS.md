# URLs pour les clients

## 📍 URLs publiques disponibles

### 1. Page publique du commerce
**Format :** `https://votre-domaine.com/{slug}`

**Exemple :** 
- Si le slug est `barber-elite` → `https://votre-domaine.com/barber-elite`
- Si le slug est `coiffure-paris` → `https://votre-domaine.com/coiffure-paris`

**Contenu :**
- Nom et adresse du commerce
- Liste des services avec prix
- Horaires d'ouverture
- Bouton "Réserver maintenant"

### 2. Page de réservation directe
**Format :** `https://votre-domaine.com/book/{slug}`

**Exemple :**
- `https://votre-domaine.com/book/barber-elite`
- `https://votre-domaine.com/book/coiffure-paris`

**Contenu :**
- Formulaire de réservation en 3 étapes :
  1. Choix du service
  2. Choix date/heure
  3. Informations client (nom, email, téléphone)

### 3. Page d'annulation
**Format :** `https://votre-domaine.com/cancel/{token}`

**Exemple :**
- `https://votre-domaine.com/cancel/abc123def456...`

**Contenu :**
- Détails du rendez-vous
- Bouton pour annuler

## 🔗 Comment obtenir l'URL de votre commerce

### Depuis l'interface admin

1. Allez dans **Paramètres** (`/settings`)
2. L'URL publique est affichée dans la section "URL publique"
3. Vous pouvez copier le lien en un clic

### Depuis le code

L'URL est générée automatiquement :
```javascript
const publicUrl = `${window.location.origin}/${business.slug}`
const bookingUrl = `${window.location.origin}/book/${business.slug}`
```

## 📋 Exemple complet

Si votre commerce a le slug `barber-elite` :

- **Page publique :** `https://vazy.com/barber-elite`
- **Réservation directe :** `https://vazy.com/book/barber-elite`
- **Annulation :** `https://vazy.com/cancel/{token-unique}`

## 💡 Recommandations

### Pour partager avec vos clients

**Option 1 : Page publique (recommandée)**
```
https://votre-domaine.com/barber-elite
```
→ Les clients voient d'abord les services, puis cliquent sur "Réserver"

**Option 2 : Réservation directe**
```
https://votre-domaine.com/book/barber-elite
```
→ Les clients arrivent directement sur le formulaire de réservation

### Pour les emails de confirmation

Incluez les deux liens :
- Lien vers la page publique : pour voir les services
- Lien d'annulation : `/cancel/{token}` (généré automatiquement)

## 🔒 Sécurité

- Les URLs publiques sont **sécurisées** via RLS (Row Level Security)
- Les clients ne peuvent **que créer** des appointments
- Les clients ne peuvent **pas voir** les autres appointments
- L'annulation nécessite le **token unique** (non devinable)

