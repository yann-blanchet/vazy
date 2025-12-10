# Guide : Catégories de services

## Fonctionnalité

Les services peuvent maintenant être organisés par catégories pour une meilleure organisation et présentation.

## Migration de la base de données

Avant d'utiliser les catégories, vous devez exécuter le script SQL suivant dans Supabase :

```sql
-- Fichier: add-category-to-services.sql
```

Ce script ajoute la colonne `category` à la table `services`.

## Utilisation

### Ajouter une catégorie à un service

1. Ouvrez le formulaire d'ajout/modification d'un service
2. Dans le champ "Catégorie", vous pouvez :
   - **Sélectionner une catégorie existante** : Tapez les premières lettres pour filtrer
   - **Créer une nouvelle catégorie** : Tapez un nouveau nom et appuyez sur Entrée

### Exemples de catégories

Pour un **coiffeur** :
- Coupes
- Coloration
- Balayage
- Soins
- Brushing

Pour un **barbier** :
- Coupes
- Rasage
- Soins barbe
- Forfaits

Pour un **esthéticien** :
- Soins visage
- Soins corps
- Épilation
- Manucure/Pédicure
- Massage

### Affichage

Les services sont automatiquement groupés par catégorie dans la liste :
- Les catégories sont triées par ordre alphabétique
- Les services sans catégorie apparaissent dans "Sans catégorie" en dernier

### Avantages

- **Organisation** : Regroupez vos services logiquement
- **Navigation** : Plus facile de trouver un service
- **Présentation** : Les clients verront les services organisés par catégorie sur la page publique (à venir)

## Notes

- Les catégories sont libres (pas de liste prédéfinie)
- Un service peut ne pas avoir de catégorie (optionnel)
- Les catégories sont spécifiques à chaque commerce



