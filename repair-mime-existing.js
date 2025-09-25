import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('🔧 [REPAIR-EXISTING] === RÉPARATION DES EMAILS MIME EXISTANTS ===');

async function repairExistingMimeEmails() {
  try {
    // Trouver tous les emails avec du contenu MIME non parsé
    const brokenEmails = await prisma.email.findMany({
      where: {
        OR: [
          { body: { contains: 'This is a multi-part message' } },
          { body: { contains: 'Content-Type:' } },
          { body: { contains: '------=' } },
          { body: { contains: '--000000000000' } },
          { body: { contains: 'Content-Transfer-Encoding:' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Traiter par lots pour éviter la surcharge
    });
    
    console.log(`🔧 [REPAIR-EXISTING] ${brokenEmails.length} emails MIME trouvés à réparer`);
    
    if (brokenEmails.length === 0) {
      console.log('✅ [REPAIR-EXISTING] Aucun email MIME à réparer !');
      return;
    }
    
    let repairedCount = 0;
    let skippedCount = 0;
    
    for (const email of brokenEmails) {
      try {
        console.log(`\n📧 [REPAIR-EXISTING] Traitement: "${email.subject}" (${email.id})`);
        
        let originalContent = email.body;
        let cleanContent = originalContent;
        
        // Fonction de nettoyage MIME améliorée
        function cleanMimeContent(content) {
          // 1. Détecter les emails MIME multi-part
          if (content.includes('This is a multi-part message') || 
              content.match(/^--[a-zA-Z0-9]/m) ||
              content.includes('------=_NextPart_') ||
              content.includes('Content-Type:')) {
            
            console.log('  🎯 Email MIME multi-part détecté');
            
            let parts = [];
            
            // Identifier le délimiteur approprié
            if (content.includes('--000000000000')) {
              parts = content.split(/^--000000000000[^\n]*$/gm);
              console.log('  📧 Délimiteur Gmail détecté');
            } else if (content.includes('------=_NextPart_')) {
              parts = content.split(/^------=_NextPart_[^\n]*$/gm);
              console.log('  📧 Délimiteur NextPart détecté');
            } else if (content.match(/^--[a-zA-Z0-9]/m)) {
              parts = content.split(/^--[a-zA-Z0-9][^\n]*$/gm);
              console.log('  📧 Délimiteur standard détecté');
            } else {
              parts = content.split(/Content-Type:/);
              console.log('  📧 Division par Content-Type');
            }
            
            console.log(`  🔍 ${parts.length} parties trouvées`);
            
            let htmlPart = null;
            let textPart = null;
            
            // Analyser chaque partie
            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              if (!part.trim()) continue;
              
              // Chercher HTML
              if (part.includes('text/html') || part.includes('text/HTML')) {
                console.log(`  ✅ Partie HTML trouvée (section ${i})`);
                
                const lines = part.split('\n');
                let contentStart = -1;
                
                for (let j = 0; j < lines.length; j++) {
                  if (lines[j].trim() === '') {
                    contentStart = j + 1;
                    break;
                  }
                }
                
                if (contentStart !== -1) {
                  htmlPart = lines.slice(contentStart).join('\n').trim();
                  
                  // Décoder quoted-printable
                  if (part.includes('quoted-printable') || htmlPart.includes('=3D')) {
                    console.log('  🔧 Décodage quoted-printable...');
                    htmlPart = htmlPart.replace(/=3D/g, '=');
                    htmlPart = htmlPart.replace(/=([0-9A-F]{2})/gi, (_, hex) => {
                      return String.fromCharCode(parseInt(hex, 16));
                    });
                    htmlPart = htmlPart.replace(/=\r?\n/g, '');
                  }
                  
                  break;
                }
              }
              // Chercher texte
              else if (part.includes('text/plain') && !htmlPart) {
                console.log(`  📝 Partie texte trouvée (section ${i})`);
                
                const lines = part.split('\n');
                let contentStart = -1;
                
                for (let j = 0; j < lines.length; j++) {
                  if (lines[j].trim() === '') {
                    contentStart = j + 1;
                    break;
                  }
                }
                
                if (contentStart !== -1) {
                  textPart = lines.slice(contentStart).join('\n').trim();
                }
              }
            }
            
            // Utiliser le meilleur contenu
            if (htmlPart && htmlPart.length > 50) {
              console.log('  🎯 Utilisation contenu HTML');
              return htmlPart;
            } else if (textPart && textPart.length > 20) {
              console.log('  📝 Conversion texte → HTML');
              return `<div style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.5; padding: 20px; color: #333;">
                ${textPart.replace(/\n/g, '<br>')}
              </div>`;
            }
          }
          
          // 2. Nettoyage des en-têtes restants
          content = content.replace(/^Message-ID:.*?\n/gim, '');
          content = content.replace(/^Content-Type:.*?\n/gim, '');
          content = content.replace(/^Content-Transfer-Encoding:.*?\n/gim, '');
          content = content.replace(/^MIME-Version:.*?\n/gim, '');
          content = content.replace(/^This is a multi-part message.*?\n/gim, '');
          content = content.replace(/^------=_NextPart_.*$/gm, '');
          
          // 3. Chercher le début du HTML
          const htmlStart = content.search(/<!DOCTYPE\s+html|<html/i);
          if (htmlStart > 0) {
            content = content.substring(htmlStart);
          }
          
          // 4. Supprimer après </html>
          const htmlEnd = content.lastIndexOf('</html>');
          if (htmlEnd > 0) {
            content = content.substring(0, htmlEnd + 7);
          }
          
          return content.trim();
        }
        
        // Appliquer le nettoyage
        cleanContent = cleanMimeContent(cleanContent);
        
        // Vérifier si le contenu a été amélioré
        const wasImproved = cleanContent !== originalContent && 
                           cleanContent.length > 50 && 
                           !cleanContent.includes('Content-Type:') &&
                           !cleanContent.includes('This is a multi-part message');
        
        if (wasImproved) {
          console.log(`  ✅ Contenu amélioré: ${originalContent.length} → ${cleanContent.length} caractères`);
          
          // Mise à jour en BDD
          await prisma.email.update({
            where: { id: email.id },
            data: { 
              body: cleanContent,
              contentType: 'text/html'
            }
          });
          
          repairedCount++;
          console.log(`  💾 Email mis à jour en BDD`);
        } else {
          console.log(`  ⏭️ Email ignoré (pas d'amélioration significative)`);
          skippedCount++;
        }
        
      } catch (emailError) {
        console.error(`❌ [REPAIR-EXISTING] Erreur pour email ${email.id}:`, emailError);
        skippedCount++;
      }
    }
    
    console.log(`\n🎯 [REPAIR-EXISTING] === RÉSUMÉ ===`);
    console.log(`✅ Emails réparés: ${repairedCount}`);
    console.log(`⏭️ Emails ignorés: ${skippedCount}`);
    console.log(`📊 Total traité: ${brokenEmails.length}`);
    
    if (repairedCount > 0) {
      console.log(`\n💡 [REPAIR-EXISTING] ${repairedCount} emails ont été améliorés !`);
      console.log(`🔄 [REPAIR-EXISTING] Rechargez l'interface pour voir les améliorations.`);
    }
    
  } catch (error) {
    console.error('❌ [REPAIR-EXISTING] Erreur globale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

repairExistingMimeEmails();
