# Configuration Supabase Storage pour les images

## Étapes de configuration

### 1. Créer le bucket de stockage

1. Allez dans votre projet Supabase
2. Naviguez vers **Storage** dans le menu de gauche
3. Cliquez sur **New bucket**
4. Configurez le bucket :
   - **Name**: `images`
   - **Public bucket**: ✅ Activé (pour que les images soient accessibles publiquement)
   - **File size limit**: 5 MB (ou selon vos besoins)
   - **Allowed MIME types**: `image/*`

### 2. Configurer les politiques RLS (Row Level Security)

**⚠️ Si vous obtenez une erreur de permissions avec le SQL, utilisez l'interface Supabase (Option 1 ci-dessous)**

**Option 1 : Via l'interface Supabase (Recommandé si le SQL ne fonctionne pas)**

📖 **Consultez le guide détaillé** : `supabase-storage-interface-guide.md`

**Résumé rapide** :
1. Allez dans **Storage** > Créez le bucket `images` (Public ✅)
2. Cliquez sur le bucket `images` > Onglet **Policies**
3. Créez 4 politiques :
   - `Users can upload images` (INSERT, authenticated, `bucket_id = 'images'`)
   - `Public can view images` (SELECT, public, `bucket_id = 'images'`)
   - `Users can update images` (UPDATE, authenticated, `bucket_id = 'images'`)
   - `Users can delete images` (DELETE, authenticated, `bucket_id = 'images'`)

**Option 2 : Via SQL**

✅ **RLS est activé** - Il suffit de créer les politiques !

**Méthode recommandée (la plus simple)** :
1. **Vérifiez que le bucket existe** :
   ```sql
   SELECT id, name, public FROM storage.buckets WHERE id = 'images';
   ```
   Si rien ne s'affiche, créez le bucket via l'interface : Storage > New bucket

2. **Exécutez le script simplifié** :
   - Ouvrez `supabase-storage-policies-simple.sql`
   - Copiez-collez dans le SQL Editor
   - Exécutez le script

**Autres options** :
- `supabase-storage-policies-fixed.sql` : Version avec vérifications avancées
- `supabase-storage-policies.sql` : Version de base

**Option 3 : Script SQL direct (version simplifiée)**

```sql
-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update images" ON storage.objects;

-- Policy pour permettre l'upload aux utilisateurs authentifiés
CREATE POLICY "Users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Policy pour permettre la lecture publique des images
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- Policy pour permettre la mise à jour aux utilisateurs authentifiés
CREATE POLICY "Users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images');

-- Policy pour permettre la suppression aux utilisateurs authentifiés
CREATE POLICY "Users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');
```

**Note** : Cette version simplifiée permet à tous les utilisateurs authentifiés de modifier/supprimer toutes les images du bucket. Pour une sécurité plus stricte (limiter aux fichiers de l'utilisateur), utilisez l'interface Supabase qui gère mieux les permissions complexes.

### 3. Vérification

Après la configuration, vous devriez pouvoir :
- ✅ Uploader des images depuis l'application
- ✅ Voir les images publiquement
- ✅ Supprimer les images que vous avez uploadées

## Structure des fichiers

Les images seront stockées dans la structure suivante :
```
images/
  └── {user_id}/
      ├── {timestamp}-{random}.jpg
      └── {timestamp}-{random}.png
```

Cette structure permet :
- D'organiser les images par utilisateur
- D'éviter les collisions de noms grâce au timestamp et au random
- De faciliter le nettoyage si nécessaire
- De respecter les permissions par utilisateur

## Notes importantes

- Le bucket doit être **public** pour que les images soient accessibles depuis l'application
- Les images sont automatiquement supprimées de Supabase Storage lorsque vous les supprimez depuis l'interface
- La taille maximale par défaut est de 5MB (configurable dans le code)
- Seuls les formats d'image sont acceptés (image/*)

## Dépannage

### Erreur 400 (Bad Request) lors de l'upload

Si vous obtenez une erreur 400, vérifiez :

1. **Le bucket existe** :
   - Allez dans Storage > Buckets
   - Vérifiez que le bucket `images` existe
   - Vérifiez qu'il est marqué comme **Public**

2. **Les politiques RLS sont configurées** :
   - Allez dans Storage > Policies
   - Vérifiez que les 4 politiques sont présentes :
     - "Users can upload images" (INSERT)
     - "Public can view images" (SELECT)
     - "Users can update their own images" (UPDATE)
     - "Users can delete their own images" (DELETE)

3. **L'utilisateur est authentifié** :
   - Vérifiez que vous êtes bien connecté
   - L'upload nécessite une authentification

4. **Les permissions du bucket** :
   - Le bucket doit être **Public** (pas privé)
   - Vérifiez les restrictions de taille et de type de fichier

### Vérifier la configuration

Pour vérifier que tout est bien configuré, exécutez cette requête SQL :

```sql
-- Vérifier que le bucket existe
SELECT * FROM storage.buckets WHERE id = 'images';

-- Vérifier les politiques
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

Si le bucket n'existe pas, créez-le manuellement depuis l'interface Supabase Storage.

