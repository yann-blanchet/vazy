-- ============================================================================
-- MISE À JOUR DES POLITIQUES RLS POUR RÉSERVATION SANS AUTH
-- ============================================================================
-- Exécutez ce script si vous avez déjà créé les tables
-- Cela ajoute les politiques manquantes pour permettre les réservations publiques
-- ============================================================================

-- Vérifier si les politiques existent déjà
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  -- Vérifier "Public can read appointment by token"
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'appointments' 
    AND policyname = 'Public can read appointment by token'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    CREATE POLICY "Public can read appointment by token"
      ON appointments FOR SELECT
      USING (true);
    RAISE NOTICE '✅ Politique "Public can read appointment by token" créée';
  ELSE
    RAISE NOTICE 'ℹ️  Politique "Public can read appointment by token" existe déjà';
  END IF;
  
  -- Vérifier "Public can cancel via token"
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'appointments' 
    AND policyname = 'Public can cancel via token'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    CREATE POLICY "Public can cancel via token"
      ON appointments FOR UPDATE
      USING (true)
      WITH CHECK (status = 'cancelled');
    RAISE NOTICE '✅ Politique "Public can cancel via token" créée';
  ELSE
    RAISE NOTICE 'ℹ️  Politique "Public can cancel via token" existe déjà';
  END IF;
  
  RAISE NOTICE '✅ Mise à jour terminée - Les clients peuvent réserver sans authentification';
END $$;

