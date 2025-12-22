# Guide : Configurer les politiques Storage via l'interface Supabase

Si vous obtenez des erreurs de permissions avec le SQL, utilisez cette méthode via l'interface Supabase.

## Étape 1 : Créer le bucket (si pas déjà fait)

1. Connectez-vous à votre projet Supabase
2. Allez dans **Storage** dans le menu de gauche
3. Cliquez sur **New bucket**
4. Configurez :
   - **Name** : `images`
   - **Public bucket** : ✅ **Activé** (très important !)
   - **File size limit** : `5242880` (5 MB en octets) ou laissez vide
   - **Allowed MIME types** : `image/*` ou laissez vide
5. Cliquez sur **Create bucket**

## Étape 2 : Configurer les politiques RLS

**Important** : Il y a deux endroits pour créer les politiques :

### Option A : Via le bucket (méthode simple)
1. Dans **Storage**, cliquez sur le bucket `images`
2. Allez dans l'onglet **Policies** (ou cliquez sur **Policies** dans le menu du bucket)

### Option B : Via Schema (méthode avancée - recommandée)
1. Allez dans **Storage** > **Policies** (ou **Authentication** > **Policies** selon votre version)
2. Trouvez la section **Schema** ou **STORAGE.OBJECTS**
3. Cliquez sur **New policy** dans la section **STORAGE.OBJECTS**

**Note** : Si vous voyez "No policies created yet" dans l'interface mais que les politiques existent en base (via SQL), créez-les quand même via l'interface pour qu'elles soient correctement gérées.

### Politique 1 : Upload (INSERT)

1. Cliquez sur **New Policy**
2. Choisissez **For full customization** (ou utilisez un template)
3. Configurez :
   - **Policy name** : `Users can upload images`
   - **Allowed operation** : `INSERT`
   - **Target roles** : `authenticated`
   - **USING expression** : (laissez vide ou `true`)
   - **WITH CHECK expression** : `bucket_id = 'images'`
4. Cliquez sur **Review** puis **Save policy**

### Politique 2 : Lecture publique (SELECT)

1. Cliquez sur **New Policy**
2. Configurez :
   - **Policy name** : `Public can view images`
   - **Allowed operation** : `SELECT`
   - **Target roles** : `public`
   - **USING expression** : `bucket_id = 'images'`
   - **WITH CHECK expression** : (laissez vide)
3. Cliquez sur **Review** puis **Save policy**

### Politique 3 : Mise à jour (UPDATE)

1. Cliquez sur **New Policy**
2. Configurez :
   - **Policy name** : `Users can update images`
   - **Allowed operation** : `UPDATE`
   - **Target roles** : `authenticated`
   - **USING expression** : `bucket_id = 'images'`
   - **WITH CHECK expression** : `bucket_id = 'images'`
3. Cliquez sur **Review** puis **Save policy**

### Politique 4 : Suppression (DELETE)

1. Cliquez sur **New Policy**
2. Configurez :
   - **Policy name** : `Users can delete images`
   - **Allowed operation** : `DELETE`
   - **Target roles** : `authenticated`
   - **USING expression** : `bucket_id = 'images'`
   - **WITH CHECK expression** : (laissez vide)
3. Cliquez sur **Review** puis **Save policy**

## Vérification

Après avoir créé les 4 politiques, vous devriez voir :
- ✅ Users can upload images (INSERT)
- ✅ Public can view images (SELECT)
- ✅ Users can update images (UPDATE)
- ✅ Users can delete images (DELETE)

## Test

Essayez maintenant d'uploader une image depuis votre application. Si ça ne fonctionne toujours pas :

1. Vérifiez que le bucket est bien **Public**
2. Vérifiez que vous êtes bien connecté dans l'application
3. Vérifiez dans la console du navigateur les erreurs détaillées

