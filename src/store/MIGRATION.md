# Migration du store CRM

Ce script permet de migrer les imports de l'ancien store (`crmStore.ts`) vers le nouveau store modulaire (`index.ts`).

## Instructions

1. Sauvegardez une copie de votre code actuel
2. Exécutez le script PowerShell ci-dessous pour remplacer les imports
3. Vérifiez que l'application fonctionne correctement
4. Une fois que tout fonctionne, vous pouvez supprimer l'ancien fichier `crmStore.ts`

## Script PowerShell pour la migration

```powershell
$rootDir = "c:\Users\Marie\Desktop\crm\src"
$oldImport = "import { useCRMStore } from '.*?/store/crmStore';"
$newImport = "import useCRMStore from '../store';"
$oldImportRelative = "import { useCRMStore } from '(\.\./)+(store/crmStore)';"
$newImportRelative = "import useCRMStore from '$1';"

# Récupérer tous les fichiers TypeScript et TSX
$files = Get-ChildItem -Path $rootDir -Recurse -Include *.ts,*.tsx

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    
    # Vérifier si le fichier contient l'ancien import
    if ($content -match $oldImport) {
        Write-Host "Mise à jour du fichier: $($file.FullName)"
        
        # Remplacer l'ancien import par le nouveau
        if ($content -match $oldImportRelative) {
            $content = $content -replace $oldImportRelative, $newImportRelative
        } else {
            $content = $content -replace $oldImport, $newImport
        }
        
        # Écrire le contenu mis à jour
        Set-Content -Path $file.FullName -Value $content
    }
}

Write-Host "Migration terminée !"
```

## Vérification manuelle

Après avoir exécuté le script, vérifiez que :

1. Tous les imports ont été mis à jour correctement
2. Les appels au store fonctionnent comme prévu
3. Aucune régression n'a été introduite

## Étapes finales

Une fois que l'application fonctionne correctement avec le nouveau store :

1. Supprimez le fichier `src/store/crmStore.ts`
2. Mettez à jour la documentation si nécessaire
3. Faites un commit avec un message clair sur la refactorisation
