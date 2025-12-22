-- Script pour nettoyer les politiques en double
-- Supprime les politiques avec suffixe et garde seulement les originales

-- Supprimer les politiques avec suffixe (doublons)
DROP POLICY IF EXISTS "Public can view images 1ffg0oo_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete images 1ffg0oo_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can update images 1ffg0oo_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload images 1ffg0oo_0" ON storage.objects;

-- Vérifier qu'il ne reste que les politiques originales
SELECT 
    policyname,
    cmd as operation,
    roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- Vous devriez maintenant voir seulement 4 politiques :
-- 1. Public can view images (SELECT, public)
-- 2. Users can delete images (DELETE, authenticated)
-- 3. Users can update images (UPDATE, authenticated)
-- 4. Users can upload images (INSERT, authenticated)

