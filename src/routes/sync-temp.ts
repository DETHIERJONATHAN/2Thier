import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Route temporaire pour sync les documents
// À SUPPRIMER après usage !
router.post('/sync-documents', async (req, res) => {
  const { secret } = req.body;
  
  // Vérification basique
  if (secret !== 'SYNC_2THIER_2024') {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  
  try {
    // Themes
    const themes = [
      { id: 'zy-AWfNv7kwiFiAIxYCyy', name: 'Corporate Bleu', primaryColor: '#1890ff', secondaryColor: '#096dd9', fontFamily: 'Arial, Helvetica, sans-serif', organizationId: '1757366075153-otief8knu' },
      { id: 'LoVb38f8kOfL2r8rIpVMm', name: 'Élégant Gris', primaryColor: '#595959', secondaryColor: '#8c8c8c', fontFamily: 'Georgia, serif', organizationId: '1757366075153-otief8knu' },
      { id: 'xMHttG0zrN81_Fu-gHnwN', name: 'Moderne Vert', primaryColor: '#52c41a', secondaryColor: '#73d13d', fontFamily: 'Verdana, Geneva, sans-serif', organizationId: '1757366075153-otief8knu' },
      { id: 'bfQB_aDQX2bs5d02ASZi7', name: 'Professionnel Violet', primaryColor: '#722ed1', secondaryColor: '#9254de', fontFamily: 'Trebuchet MS, sans-serif', organizationId: '1757366075153-otief8knu' },
      { id: 'QfHTFecgN_BB0me-PAZZG', name: 'Dynamique Orange', primaryColor: '#fa8c16', secondaryColor: '#ffa940', fontFamily: 'Arial, sans-serif', organizationId: '1757366075153-otief8knu' },
      { id: 'fw6tmVAi26iAEQBbVlkaw', name: 'Sobre Noir & Blanc', primaryColor: '#000000', secondaryColor: '#262626', fontFamily: 'Times New Roman, serif', organizationId: '1757366075153-otief8knu' },
      { id: 'vvZ4U2NJ_wxaP8rSmqOXD', name: 'Corporate Bleu', primaryColor: '#1890ff', secondaryColor: '#096dd9', fontFamily: 'Arial, Helvetica, sans-serif', organizationId: '1757366075154-i554z93kl' },
      { id: 'KZrfAoWjOYpKPVNd_CGEq', name: 'Élégant Gris', primaryColor: '#595959', secondaryColor: '#8c8c8c', fontFamily: 'Georgia, serif', organizationId: '1757366075154-i554z93kl' },
      { id: 'ABaRcqHtCJyxsYkIL7bwV', name: 'Moderne Vert', primaryColor: '#52c41a', secondaryColor: '#73d13d', fontFamily: 'Verdana, Geneva, sans-serif', organizationId: '1757366075154-i554z93kl' },
      { id: 'EPG4Rme8JoZuAObPxlCfu', name: 'Professionnel Violet', primaryColor: '#722ed1', secondaryColor: '#9254de', fontFamily: 'Trebuchet MS, sans-serif', organizationId: '1757366075154-i554z93kl' },
      { id: 'ggBUu9jdk5qe0uyChmQoQ', name: 'Dynamique Orange', primaryColor: '#fa8c16', secondaryColor: '#ffa940', fontFamily: 'Arial, sans-serif', organizationId: '1757366075154-i554z93kl' },
      { id: 'Zgj4_Kicsk6_zGGkFKnV1', name: 'Sobre Noir & Blanc', primaryColor: '#000000', secondaryColor: '#262626', fontFamily: 'Times New Roman, serif', organizationId: '1757366075154-i554z93kl' },
    ];

    // Templates
    const templates = [
      { id: 'G7YU14mfKT9rEj7wD38lD', name: 'Bilan énergétique', type: 'QUOTE', organizationId: '1757366075154-i554z93kl' },
      { id: 'lKcJIIkGPzAZZL6E7VGA9', name: 'PV', type: 'QUOTE', organizationId: '1757366075154-i554z93kl' },
    ];

    // Sections (sans le champ name qui n'existe plus)
    const sections = [
      { id: 'oySHrW8g46r5zbtrFxULg', templateId: 'lKcJIIkGPzAZZL6E7VGA9', type: 'MODULAR_PAGE', order: 0 },
      { id: 'pN8RSMjUtymo9balcF4ux', templateId: 'G7YU14mfKT9rEj7wD38lD', type: 'MODULAR_PAGE', order: 0 },
      { id: 'm2_i4PAXeQwgVM2O2HX_7', templateId: 'G7YU14mfKT9rEj7wD38lD', type: 'MODULAR_PAGE', order: 1 },
      { id: '4Snr4bjuSzky1oG_Ex03o', templateId: 'G7YU14mfKT9rEj7wD38lD', type: 'MODULAR_PAGE', order: 2 },
      { id: 'q9v4OwgdrazlRQFdPBJs0', templateId: 'G7YU14mfKT9rEj7wD38lD', type: 'MODULAR_PAGE', order: 3 },
    ];

    // Upsert themes
    for (const theme of themes) {
      await prisma.documentTheme.upsert({
        where: { id: theme.id },
        update: theme,
        create: theme,
      });
    }

    // Upsert templates  
    for (const template of templates) {
      await prisma.documentTemplate.upsert({
        where: { id: template.id },
        update: template,
        create: template,
      });
    }

    // Upsert sections
    for (const section of sections) {
      await prisma.documentSection.upsert({
        where: { id: section.id },
        update: section,
        create: section,
      });
    }

    res.json({ 
      success: true, 
      synced: {
        themes: themes.length,
        templates: templates.length,
        sections: sections.length
      }
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
