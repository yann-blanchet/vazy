# Vérifier l'état de votre base de données SQL

## Comment savoir si vous devez exécuter le SQL ?

### Option 1 : Vérifier si les tables existent

Exécutez cette requête dans Supabase SQL Editor :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('businesses', 'services', 'appointments', 'availability', 'customers');
```

**Si vous voyez 5 tables** → Les tables existent, passez à l'Option 2
**Si vous voyez 0 table** → Exécutez `supabase-schema.sql` (nouvelle installation)

### Option 2 : Vérifier les politiques RLS

Exécutez cette requête :

```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'appointments' 
AND policyname LIKE '%Public%';
```

**Résultats attendus :**
- `Public can create appointments` ✅
- `Public can read appointment by token` ✅
- `Public can cancel via token` ✅

**Si une politique manque** → Exécutez `update-rls-policies.sql`

## Scénarios

### Scénario A : Nouvelle installation
1. Exécutez `supabase-schema.sql` (tout en un)
2. C'est tout ! ✅

### Scénario B : Base existante (tables créées)
1. Vérifiez les politiques avec la requête ci-dessus
2. Si des politiques manquent → Exécutez `update-rls-policies.sql`
3. C'est tout ! ✅

### Scénario C : Vous n'êtes pas sûr
1. Exécutez `update-rls-policies.sql` (idempotent, ne fera rien si déjà présent)
2. C'est sûr ! ✅

## Vérification finale

Après exécution, testez :

```sql
-- Vérifier que tout est en place
SELECT 
  'businesses' as table_name,
  COUNT(*) as row_count
FROM businesses
UNION ALL
SELECT 'services', COUNT(*) FROM services
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments;

-- Vérifier les politiques
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('businesses', 'services', 'appointments')
ORDER BY tablename, policyname;
```

