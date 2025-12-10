# Guide : Gestion des Catégories de Services

## Vue d'ensemble

Les catégories de services permettent d'organiser vos services de manière structurée. Contrairement à l'ancien système où les catégories étaient simplement du texte libre, le nouveau système utilise une table dédiée `service_categories` qui permet :

- ✅ De renommer une catégorie (tous les services associés sont automatiquement mis à jour)
- ✅ De supprimer des catégories (avec vérification qu'aucun service ne l'utilise)
- ✅ De réorganiser l'ordre d'affichage des catégories
- ✅ Une meilleure intégrité des données

## Installation

### 1. Exécuter le script SQL

Exécutez le script `create-service-categories-table.sql` dans votre base de données Supabase :

```sql
-- Le script va :
-- 1. Créer la table service_categories
-- 2. Migrer automatiquement vos catégories existantes (colonne category TEXT)
-- 3. Ajouter la colonne category_id à la table services
-- 4. Mettre à jour tous les services pour utiliser category_id
```

**Note** : La colonne `category` (TEXT) est conservée temporairement pour compatibilité, mais sera supprimée dans une future version.

### 2. Vérifier la migration

Après l'exécution du script, vérifiez que :
- La table `service_categories` existe
- Vos services ont un `category_id` correspondant
- Les catégories ont été créées correctement

## Utilisation

### Gérer les catégories

1. **Accéder à la gestion des catégories** :
   - Allez dans la page "Services"
   - Cliquez sur le bouton "Gérer les catégories"

2. **Créer une catégorie** :
   - Cliquez sur "Ajouter une catégorie"
   - Entrez le nom de la catégorie
   - Cliquez sur "Enregistrer"

3. **Modifier une catégorie** :
   - Dans la liste des catégories, cliquez sur l'icône "Modifier" (crayon)
   - Modifiez le nom
   - Cliquez sur "Enregistrer"
   - **Tous les services utilisant cette catégorie seront automatiquement mis à jour**

4. **Supprimer une catégorie** :
   - Cliquez sur l'icône "Supprimer" (poubelle)
   - Confirmez la suppression
   - **Note** : Vous ne pouvez pas supprimer une catégorie si des services l'utilisent encore

### Assigner une catégorie à un service

1. Lors de la création ou modification d'un service :
   - Dans le formulaire, sélectionnez une catégorie dans le menu déroulant
   - Vous pouvez laisser vide pour un service sans catégorie

2. Les services sont automatiquement groupés par catégorie dans la liste

## Affichage

### Pour le commerçant

- Les services sont groupés par catégorie
- Chaque catégorie affiche ses services
- Les services sans catégorie apparaissent dans "Sans catégorie"
- L'ordre d'affichage suit le `display_order` des catégories

### Pour les clients (page publique)

- Les services sont également groupés par catégorie
- L'affichage est cohérent avec la vue commerçant

## Structure de la base de données

### Table `service_categories`

```sql
- id (UUID) : Identifiant unique
- business_id (UUID) : Référence au commerce
- name (TEXT) : Nom de la catégorie
- display_order (INTEGER) : Ordre d'affichage
- created_at, updated_at (TIMESTAMPTZ)
```

### Table `services`

```sql
- category_id (UUID) : Référence à service_categories.id (peut être NULL)
- category (TEXT) : DEPRECATED - Conservé temporairement pour compatibilité
```

## Migration depuis l'ancien système

Si vous aviez déjà des services avec des catégories (colonne `category` TEXT), le script SQL migre automatiquement :

1. Crée une catégorie pour chaque nom unique de catégorie par commerce
2. Met à jour tous les services pour utiliser `category_id`
3. Conserve la colonne `category` temporairement

## Avantages du nouveau système

1. **Intégrité référentielle** : Les catégories sont des entités à part entière
2. **Renommage facile** : Modifier le nom d'une catégorie met à jour tous les services
3. **Ordre personnalisable** : Contrôle de l'ordre d'affichage via `display_order`
4. **Gestion centralisée** : Interface dédiée pour gérer les catégories
5. **Validation** : Impossible de supprimer une catégorie utilisée

## Notes importantes

- ⚠️ La suppression d'une catégorie nécessite que tous les services qui l'utilisent soient d'abord réassignés ou supprimés
- ⚠️ Le renommage d'une catégorie est immédiat et affecte tous les services
- ✅ Les services peuvent exister sans catégorie (category_id = NULL)



