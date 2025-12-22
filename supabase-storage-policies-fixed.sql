-- Script SQL pour configurer les politiques RLS pour le bucket 'images'
-- Version avec noms qualifiés complets et vérifications
-- À exécuter dans le SQL Editor de Supabase

-- ÉTAPE 1 : Vérifier que le bucket existe (exécutez d'abord cette requête)
-- Si cette requête ne retourne rien, créez le bucket via l'interface Supabase
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'images';

-- Si le bucket n'existe pas, créez-le via l'interface :
-- Storage > New bucket > Name: images > Public: ✅ > Create bucket

-- ÉTAPE 2 : Créer les politiques (exécutez seulement si le bucket existe)

-- Supprimer les politiques existantes si elles existent
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
    DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update images" ON storage.objects;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de la suppression des politiques: %', SQLERRM;
END $$;

-- Policy pour permettre l'upload aux utilisateurs authentifiés
CREATE POLICY "Users can upload images"
ON storage.objects 
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Policy pour permettre la lecture publique des images
CREATE POLICY "Public can view images"
ON storage.objects 
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Policy pour permettre la mise à jour aux utilisateurs authentifiés
CREATE POLICY "Users can update images"
ON storage.objects 
FOR UPDATE
TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Policy pour permettre la suppression aux utilisateurs authentifiés
CREATE POLICY "Users can delete images"
ON storage.objects 
FOR DELETE
TO authenticated
USING (bucket_id = 'images');

-- ÉTAPE 3 : Vérifier que les politiques ont été créées
SELECT 
    policyname,
    cmd as operation,
    roles,
    qual as using_expression,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

