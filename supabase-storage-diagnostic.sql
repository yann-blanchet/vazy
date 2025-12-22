-- Script de diagnostic pour vérifier la configuration Storage
-- Exécutez ce script pour vérifier l'état actuel

-- 1. Vérifier que le schéma storage existe et est accessible
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'storage';

-- 2. Vérifier que la table objects existe
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'storage' AND table_name = 'objects';

-- 3. Vérifier que le bucket 'images' existe
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'images';

-- 4. Vérifier les politiques existantes sur storage.objects
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 5. Vérifier si RLS est activé sur storage.objects
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

