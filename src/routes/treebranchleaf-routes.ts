import { PrismaClient } from '@prisma/client';

// ...existing code...

async function mapJSONToColumns(
  metadata: any,
  existingNode: Node | null,
  prisma: PrismaClient,
  orgId: string
): Promise<any> {
  const columnData: any = {};

  // Correction: S'assurer que metadata n'est pas null/undefined avant de l'utiliser
  if (metadata && metadata.repeater) {
    const repeaterMeta = metadata.repeater;
    console.log('🔍 [mapJSONToColumns] Traitement repeaterMeta:', repeaterMeta);

    if (repeaterMeta.templateNodeIds) {
      columnData.repeater_templateNodeIds = JSON.stringify(
        repeaterMeta.templateNodeIds
      );
      console.log(
        '✅ [mapJSONToColumns] 🏷️ repeater_templateNodeIds sauvegardé:',
        repeaterMeta.templateNodeIds
      );
    }

    // Gérer repeater_templateNodeLabels
    if (repeaterMeta.templateNodeLabels) {
      columnData.repeater_templateNodeLabels = JSON.stringify(
        repeaterMeta.templateNodeLabels
      );
      console.log(
        '✅ [mapJSONToColumns] 🏷️ repeater_templateNodeLabels sauvegardé:',
        repeaterMeta.templateNodeLabels
      );
    } else if ('templateNodeLabels' in repeaterMeta) {
      // Assurer que la colonne est vidée si les labels sont absents
      columnData.repeater_templateNodeLabels = null;
    }

    if (typeof repeaterMeta.minItems !== 'undefined') {
      columnData.repeater_minItems = repeaterMeta.minItems;
    }

    if (typeof repeaterMeta.maxItems !== 'undefined') {
      columnData.repeater_maxItems = repeaterMeta.maxItems;
    }

    if (typeof repeaterMeta.addButtonLabel !== 'undefined') {
      columnData.repeater_addButtonLabel = repeaterMeta.addButtonLabel;
    }

    // ✅ NOUVEAUX PARAMÈTRES D'APPARENCE DU BOUTON
    if (typeof repeaterMeta.buttonSize !== 'undefined') {
      columnData.repeater_buttonSize = repeaterMeta.buttonSize;
      console.log('✅ [mapJSONToColumns] 🎨 repeater_buttonSize sauvegardé:', repeaterMeta.buttonSize);
    }

    if (typeof repeaterMeta.buttonWidth !== 'undefined') {
      columnData.repeater_buttonWidth = repeaterMeta.buttonWidth;
      console.log('✅ [mapJSONToColumns] 🎨 repeater_buttonWidth sauvegardé:', repeaterMeta.buttonWidth);
    }

    if (typeof repeaterMeta.iconOnly !== 'undefined') {
      columnData.repeater_iconOnly = repeaterMeta.iconOnly;
      console.log('✅ [mapJSONToColumns] 🎨 repeater_iconOnly sauvegardé:', repeaterMeta.iconOnly);
    }
  }

  if (metadata && metadata.appearance) {
    columnData.appearance = JSON.stringify(metadata.appearance);
  }

  return columnData;
}

// ...existing code...