-- AlterTable: Ajouter le champ mailProvider pour distinguer Gmail et Yandex
ALTER TABLE "public"."EmailAccount" ADD COLUMN "mailProvider" TEXT NOT NULL DEFAULT 'gmail';
