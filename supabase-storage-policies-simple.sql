-- Script SQL simplifié pour créer les politiques RLS
-- RLS est déjà activé sur storage.objects, il faut juste créer les politiques
-- Exécutez ce script dans le SQL Editor de Supabase

-- IMPORTANT : Assurez-vous que le bucket 'images' existe d'abord !
-- Si le bucket n'existe pas, créez-le via l'interface : Storage > New bucket

-- Vérifier que le bucket existe (exécutez cette ligne séparément pour vérifier)
-- SELECT id, name, public FROM storage.buckets WHERE id = 'images';

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update images" ON storage.objects;

-- Créer la politique INSERT (upload)
CREATE POLICY "Users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Créer la politique SELECT (lecture publique)
CREATE POLICY "Public can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Créer la politique UPDATE (mise à jour)
CREATE POLICY "Users can update images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Créer la politique DELETE (suppression)
CREATE POLICY "Users can delete images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images');

-- Vérifier que les politiques ont été créées
SELECT 
    policyname,
    cmd as operation,
    roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

