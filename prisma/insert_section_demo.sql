-- Script SQL pour créer une section de test dans un block existant
-- Remplacez <blockId> par l'UUID réel d'un block de votre base

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO "Section" (id, name, "order", "blockId")
VALUES (gen_random_uuid(), 'Section démo créée par script', 1, '<blockId>');

-- Pour vérifier :
-- SELECT * FROM "Section" WHERE "blockId" = '<blockId>';
