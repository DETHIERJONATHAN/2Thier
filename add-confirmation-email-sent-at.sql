-- Ajouter la colonne confirmationEmailSentAt à la table User
-- Permet de savoir quand le dernier email de confirmation a été envoyé
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "confirmationEmailSentAt" TIMESTAMP;
