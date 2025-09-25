-- Migration TBL Bridge V2.0 - NON-DESTRUCTIVE
-- Ajoute les colonnes TBL à la table TreeBranchLeafNode existante
-- IMPORTANT: Aucune suppression, que des ajouts pour préserver les données

-- Ajout des colonnes TBL Bridge à TreeBranchLeafNode
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "tbl_code" VARCHAR(2),
ADD COLUMN "tbl_type" INTEGER,
ADD COLUMN "tbl_capacity" INTEGER,
ADD COLUMN "tbl_auto_generated" BOOLEAN DEFAULT false,
ADD COLUMN "tbl_created_at" TIMESTAMP(3),
ADD COLUMN "tbl_updated_at" TIMESTAMP(3);

-- Index pour optimiser les recherches TBL
CREATE INDEX "TreeBranchLeafNode_tbl_code_idx" ON "TreeBranchLeafNode"("tbl_code");
CREATE INDEX "TreeBranchLeafNode_tbl_type_idx" ON "TreeBranchLeafNode"("tbl_type");
CREATE INDEX "TreeBranchLeafNode_tbl_capacity_idx" ON "TreeBranchLeafNode"("tbl_capacity");
CREATE INDEX "TreeBranchLeafNode_tbl_auto_generated_idx" ON "TreeBranchLeafNode"("tbl_auto_generated");

-- Contrainte d'unicité sur le code TBL (optionnelle, peut être supprimée si doublons acceptés)
-- CREATE UNIQUE INDEX "TreeBranchLeafNode_tbl_code_unique" ON "TreeBranchLeafNode"("tbl_code") WHERE "tbl_code" IS NOT NULL;

-- Contraintes de validation pour assurer l'intégrité des codes TBL
ALTER TABLE "TreeBranchLeafNode" 
ADD CONSTRAINT "tbl_code_format" CHECK ("tbl_code" IS NULL OR "tbl_code" ~ '^[1-7][1-4]$'),
ADD CONSTRAINT "tbl_type_range" CHECK ("tbl_type" IS NULL OR ("tbl_type" >= 1 AND "tbl_type" <= 7)),
ADD CONSTRAINT "tbl_capacity_range" CHECK ("tbl_capacity" IS NULL OR ("tbl_capacity" >= 1 AND "tbl_capacity" <= 4));

-- Commentaires pour documentation
COMMENT ON COLUMN "TreeBranchLeafNode"."tbl_code" IS 'Code TBL 2-chiffres: [TYPE][CAPACITE] - Ex: 62 = Prix/Intermédiaire';
COMMENT ON COLUMN "TreeBranchLeafNode"."tbl_type" IS 'Type TBL: 1=Prix, 2=Quantité, 3=Texte, 4=Date, 5=Logique, 6=Calcul, 7=Référence';
COMMENT ON COLUMN "TreeBranchLeafNode"."tbl_capacity" IS 'Capacité TBL: 1=Simple, 2=Intermédiaire, 3=Complexe, 4=Expert';
COMMENT ON COLUMN "TreeBranchLeafNode"."tbl_auto_generated" IS 'Indique si le code TBL a été généré automatiquement par TBL Bridge';
COMMENT ON COLUMN "TreeBranchLeafNode"."tbl_created_at" IS 'Date de création du code TBL';
COMMENT ON COLUMN "TreeBranchLeafNode"."tbl_updated_at" IS 'Date de dernière mise à jour du code TBL';

-- Trigger pour mettre à jour automatiquement tbl_updated_at
CREATE OR REPLACE FUNCTION update_tbl_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."tbl_updated_at" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tbl_updated_at
    BEFORE UPDATE ON "TreeBranchLeafNode"
    FOR EACH ROW
    WHEN (OLD."tbl_code" IS DISTINCT FROM NEW."tbl_code" OR 
          OLD."tbl_type" IS DISTINCT FROM NEW."tbl_type" OR 
          OLD."tbl_capacity" IS DISTINCT FROM NEW."tbl_capacity")
    EXECUTE FUNCTION update_tbl_updated_at();