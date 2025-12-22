-- Script SQL pour configurer les politiques RLS pour le bucket 'images'
-- À exécuter dans le SQL Editor de Supabase
-- Si ce script ne fonctionne pas, utilisez l'interface Supabase (voir supabase-storage-interface-guide.md)

-- IMPORTANT : Assurez-vous que le bucket 'images' existe avant d'exécuter ce script
-- Créez-le via l'interface Supabase : Storage > New bucket > Name: images > Public: ✅

-- Vérifier que le schéma storage est accessible
SET search_path TO public, storage;

-- Supprimer les politiques existantes si elles existent (optionnel)
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
-- Version simplifiée : tous les utilisateurs authentifiés peuvent modifier les images
CREATE POLICY "Users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images');

-- Policy pour permettre la suppression aux utilisateurs authentifiés
-- Version simplifiée : tous les utilisateurs authentifiés peuvent supprimer les images
CREATE POLICY "Users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');

