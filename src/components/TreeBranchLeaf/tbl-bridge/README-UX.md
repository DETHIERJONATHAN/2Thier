# UX TBL — Staging, Preview, Commit

Ce guide résume les actions côté UI et leur effet côté backend (TBL Prisma only).

## Principes
- Pas d’écriture tant que l’utilisateur n’a pas « enregistré » (commit). Les modifications passent par un stage en mémoire.
- `operationDetail` reste brut; `operationResult` est lisible avec un unique "(=) Result (x)".
- Sauvegardes idempotentes: si aucune valeur ne change, aucune écriture.

## Flux
- Edition: setField → stage (in-memory) → preview (évaluation sans DB)
- Enregistrer brouillon: commitToExisting (si une soumission existe) ou commitAsNew (crée une soumission)
- Créer un nouveau devis explicite: commitAsNew
- Abandonner: discardStage

## Hooks côté UI
- `src/hooks/useTblSubmission.ts` (central) expose: `setField`, `previewNow`, `commitToExisting`, `commitAsNew`, `discardStage`...
- `treebranchleaf-new/hooks/useTblSubmission.ts` est un wrapper de compatibilité (utilisé par `TblContainer.tsx`).

## Endpoints clés
- POST `/api/tbl/submissions/stage` → staging in-memory
- POST `/api/tbl/submissions/stage/preview` → évaluation sans DB
- POST `/api/tbl/submissions/stage/commit` → commit vers soumission existante ou nouvelle
- POST `/api/tbl/submissions/stage/discard` → abandonner le stage
- POST `/api/tbl/submissions/preview-evaluate` → alternative de preview directe (sans stage)

## Test rapide (PowerShell)
Exemples compatibles PowerShell (évite les pièges JSON):

```powershell
# Prévisualiser (sans DB)
$body = @{ treeId = 'tree-tbl-new'; formData = @{ champ1 = 'oui'; surface = 40 } } | ConvertTo-Json -Depth 5 -Compress
curl.exe -s -S -X POST "http://localhost:4000/api/tbl/submissions/preview-evaluate" -H "Content-Type: application/json" -H "x-organization-id: <org-id>" -d $body | Out-String

# Stager et prévisualiser
$stage = @{ stageId = $null; treeId = 'tree-tbl-new'; submissionId = $null; formData = @{ champ1 = 'oui' } } | ConvertTo-Json -Depth 5 -Compress
$stageRes = curl.exe -s -S -X POST "http://localhost:4000/api/tbl/submissions/stage" -H "Content-Type: application/json" -H "x-organization-id: <org-id>" -d $stage | ConvertFrom-Json
$pvBody = @{ stageId = $stageRes.stage.id } | ConvertTo-Json -Compress
curl.exe -s -S -X POST "http://localhost:4000/api/tbl/submissions/stage/preview" -H "Content-Type: application/json" -H "x-organization-id: <org-id>" -d $pvBody | Out-String

# Commit en brouillon (création nouvelle soumission)
$commitBody = @{ stageId = $stageRes.stage.id; asNew = $true } | ConvertTo-Json -Compress
curl.exe -s -S -X POST "http://localhost:4000/api/tbl/submissions/stage/commit" -H "Content-Type: application/json" -H "x-organization-id: <org-id>" -d $commitBody | Out-String
```

Astuce: ajoutez `-Depth 5` à ConvertTo-Json pour des objets imbriqués.
