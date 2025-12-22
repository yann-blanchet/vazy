# Créer les politiques Storage via la section Schema

Si vous voyez la section "Schema" dans Supabase Storage Policies, voici comment créer les politiques :

## Étape 1 : Accéder à la section Schema

1. Allez dans **Storage** > **Policies** (ou **Authentication** > **Policies**)
2. Trouvez la section **Schema** (avec fond vert clair)
3. Vous devriez voir deux sections :
   - **STORAGE.OBJECTS** - Pour les politiques sur les fichiers
   - **STORAGE.BUCKETS** - Pour les politiques sur les buckets

## Étape 2 : Créer les politiques pour STORAGE.OBJECTS

Cliquez sur **New policy** dans la section **STORAGE.OBJECTS**

### Politique 1 : Upload (INSERT)

1. **Policy name** : `Users can upload images`
2. **Allowed operation** : `INSERT`
3. **Target roles** : `authenticated`
4. **USING expression** : (laissez vide)
5. **WITH CHECK expression** : `bucket_id = 'images'`
6. Cliquez sur **Save**

### Politique 2 : Lecture publique (SELECT)

1. **Policy name** : `Public can view images`
2. **Allowed operation** : `SELECT`
3. **Target roles** : `public`
4. **USING expression** : `bucket_id = 'images'`
5. **WITH CHECK expression** : (laissez vide)
6. Cliquez sur **Save**

### Politique 3 : Mise à jour (UPDATE)

1. **Policy name** : `Users can update images`
2. **Allowed operation** : `UPDATE`
3. **Target roles** : `authenticated`
4. **USING expression** : `bucket_id = 'images'`
5. **WITH CHECK expression** : `bucket_id = 'images'`
6. Cliquez sur **Save**

### Politique 4 : Suppression (DELETE)

1. **Policy name** : `Users can delete images`
2. **Allowed operation** : `DELETE`
3. **Target roles** : `authenticated`
4. **USING expression** : `bucket_id = 'images'`
5. **WITH CHECK expression** : (laissez vide)
6. Cliquez sur **Save**

## Vérification

Après avoir créé les 4 politiques, vous devriez voir :
- ✅ Users can upload images (INSERT)
- ✅ Public can view images (SELECT)
- ✅ Users can update images (UPDATE)
- ✅ Users can delete images (DELETE)

Dans la section **STORAGE.OBJECTS** au lieu de "No policies created yet".

## Note importante

Si vous avez déjà créé des politiques via SQL et qu'elles n'apparaissent pas dans l'interface, vous pouvez :
1. Les supprimer via SQL (avec `DROP POLICY`)
2. Les recréer via l'interface (méthode recommandée)

Ou simplement créer de nouvelles politiques via l'interface - elles remplaceront/coexisteront avec les anciennes.

