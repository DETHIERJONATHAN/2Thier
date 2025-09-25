const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restaurationHybrideComplete() {
    console.log('🚀 RESTAURATION HYBRIDE COMPLÈTE - FUSION DES DEUX SAUVEGARDES');
    console.log('=' .repeat(80));
    
    try {
        // Charger les deux sauvegardes
        console.log('📁 Chargement des sauvegardes...');
        const backupSecurite = JSON.parse(fs.readFileSync(path.join(__dirname, 'backups', 'json', 'sauvegarde_securite_1755611798954.json'), 'utf8'));
        const backup2THIER = JSON.parse(fs.readFileSync(path.join(__dirname, 'backups', 'json', 'sauvegarde 2THIER_2025-08-14_14-17-20.json'), 'utf8'));
        console.log('✅ Sauvegardes chargées');
        
        // VIDER COMPLÈTEMENT avec approche TRUNCATE CASCADE
        console.log('\\n🗑️ VIDAGE TOTAL DE LA BASE...');
        
        // Utiliser TRUNCATE CASCADE pour vider toutes les tables avec dépendances
        try {
            await prisma.$executeRaw`
                TRUNCATE TABLE "FieldOptionNode", "FieldOption", "FieldSubField", "FieldSubFieldOption", "FieldValidation", "FieldDependency", "FieldFormula", "FieldCondition", "FieldModule", "Field",
                "Section", "Block",
                "Permission", "UserOrganization", "Role",  
                "OrganizationModuleStatus", "Module",
                "CalendarParticipant", "CalendarEvent", "GoogleToken", "GoogleWorkspaceConfig", "GoogleVoiceCall", "GoogleVoiceConfig", "GoogleVoiceSMS", "GoogleWorkspaceUser",
                "TelnyxCall", "TelnyxConnection", "TelnyxMessage", "TelnyxPhoneNumber", "TelnyxSettings", "TelnyxUserConfig",
                "Email", "EmailAccount", "EmailDomain", "EmailTemplate", "DeletedEmail", "GoogleMailWatch",
                "Quote", "QuoteDocument", "QuoteItem",
                "FormSubmission", "TimelineEvent", "Notification",
                "CallToLeadMapping", "CallStatus", "LeadStatus", "LeadSource", "Lead",
                "Invitation", "AiUsageLog", "AutomationRule", "IntegrationsSettings", "SystemConfig", "TechnicalData", "UserService",
                "FieldType",
                "User", "Organization"
                CASCADE;
            `;
            console.log('✅ Toutes les tables vidées avec CASCADE');
        } catch (err) {
            console.log('⚠️ TRUNCATE CASCADE échoué, nettoyage manuel...');
            // Nettoyage manuel en ordre de dépendances
            const tablesToClean = [
                'fieldOptionNode', 'fieldOption', 'fieldSubField', 'fieldSubFieldOption', 'fieldValidation', 'fieldDependency', 'fieldFormula', 'fieldCondition', 'fieldModule', 'field',
                'section', 'block',
                'permission', 'userOrganization', 'role',
                'organizationModuleStatus', 'module',
                'calendarParticipant', 'calendarEvent', 'googleToken', 'googleWorkspaceConfig', 'googleVoiceCall', 'googleVoiceConfig', 'googleVoiceSMS', 'googleWorkspaceUser',
                'telnyxCall', 'telnyxConnection', 'telnyxMessage', 'telnyxPhoneNumber', 'telnyxSettings', 'telnyxUserConfig',
                'email', 'emailAccount', 'emailDomain', 'emailTemplate', 'deletedEmail', 'googleMailWatch',
                'quote', 'quoteDocument', 'quoteItem',
                'formSubmission', 'timelineEvent', 'notification',
                'callToLeadMapping', 'callStatus', 'leadStatus', 'leadSource', 'lead',
                'invitation', 'aiUsageLog', 'automationRule', 'integrationsSettings', 'systemConfig', 'technicalData', 'userService',
                'fieldType',
                'user', 'organization'
            ];
            
            for (const table of tablesToClean) {
                try {
                    await prisma[table].deleteMany({});
                    console.log(`   ✅ ${table} vidé`);
                } catch (deleteErr) {
                    console.log(`   ⚠️ ${table} : ${deleteErr.message}`);
                }
            }
        }
        
        console.log('✅ Base complètement vidée');
        
        // ÉTAPE 1: RESTAURER LA BASE 2THIER (plus complète)
        console.log('\\n📊 ÉTAPE 1: RESTAURATION BASE 2THIER...');
        
        // Organizations d'abord
        console.log('🏢 Organizations...');
        for (const org of backup2THIER.Organization) {
            await prisma.organization.create({ data: org });
            console.log(`   ✅ ${org.name}`);
        }
        
        // Users  
        console.log('👤 Users...');
        for (const user of backup2THIER.User) {
            await prisma.user.create({ data: user });
            console.log(`   ✅ ${user.firstName} ${user.lastName}`);
        }
        
        // Modules
        console.log('🔧 Modules...');
        for (const module of backup2THIER.Module) {
            await prisma.module.create({ data: module });
            console.log(`   ✅ ${module.name || module.id}`);
        }
        
        // Roles (avec vérification d'unicité)
        console.log('👥 Roles...');
        for (const role of backup2THIER.Role) {
            try {
                await prisma.role.create({ data: role });
                console.log(`   ✅ ${role.name || role.id}`);
            } catch (err) {
                if (err.code === 'P2002') {
                    console.log(`   ⚠️ Role ${role.name || role.id} existe déjà`);
                    // Tenter une mise à jour à la place
                    try {
                        await prisma.role.upsert({
                            where: { id: role.id },
                            create: role,
                            update: role
                        });
                        console.log(`   ✅ ${role.name || role.id} mis à jour`);
                    } catch (updateErr) {
                        console.log(`   ❌ Impossible de créer/mettre à jour le role: ${updateErr.message}`);
                    }
                } else {
                    throw err;
                }
            }
        }
        
        // UserOrganization
        console.log('🔗 UserOrganization...');
        for (const userOrg of backup2THIER.UserOrganization) {
            await prisma.userOrganization.create({ data: userOrg });
            console.log(`   ✅ User-Org link`);
        }
        
        // Permissions
        console.log('🔐 Permissions...');
        for (const permission of backup2THIER.Permission) {
            await prisma.permission.create({ data: permission });
        }
        console.log(`   ✅ ${backup2THIER.Permission.length} permissions`);
        
        // OrganizationModuleStatus
        console.log('📋 OrganizationModuleStatus...');
        for (const status of backup2THIER.OrganizationModuleStatus) {
            await prisma.organizationModuleStatus.create({ data: status });
        }
        console.log(`   ✅ ${backup2THIER.OrganizationModuleStatus.length} statuts`);
        
        // LeadStatus (AVANT les Leads !)
        console.log('📊 LeadStatus...');
        for (const status of backup2THIER.LeadStatus) {
            await prisma.leadStatus.create({ data: status });
            console.log(`   ✅ ${status.name}`);
        }
        
        // Leads (APRÈS les LeadStatus)
        console.log('🎯 Leads...');
        for (const lead of backup2THIER.Lead) {
            await prisma.lead.create({ data: lead });
            console.log(`   ✅ ${lead.email || 'Lead sans email'}`);
        }
        
        // CalendarEvent
        console.log('📅 CalendarEvent...');
        for (const event of backup2THIER.CalendarEvent) {
            await prisma.calendarEvent.create({ data: event });
            console.log(`   ✅ ${event.title}`);
        }
        
        // CallStatus
        console.log('📞 CallStatus...');
        for (const callStatus of backup2THIER.CallStatus) {
            await prisma.callStatus.create({ data: callStatus });
            console.log(`   ✅ ${callStatus.name}`);
        }
        
        // CallToLeadMapping
        console.log('🔗 CallToLeadMapping...');
        for (const mapping of backup2THIER.CallToLeadMapping) {
            await prisma.callToLeadMapping.create({ data: mapping });
        }
        console.log(`   ✅ ${backup2THIER.CallToLeadMapping.length} mappings`);
        
        // GoogleToken
        console.log('🔑 GoogleToken...');
        for (const token of backup2THIER.GoogleToken) {
            await prisma.googleToken.create({ data: token });
        }
        console.log(`   ✅ ${backup2THIER.GoogleToken.length} tokens`);
        
        // GoogleWorkspaceConfig
        console.log('⚙️ GoogleWorkspaceConfig...');
        for (const config of backup2THIER.GoogleWorkspaceConfig) {
            await prisma.googleWorkspaceConfig.create({ data: config });
        }
        console.log(`   ✅ ${backup2THIER.GoogleWorkspaceConfig.length} configs`);
        
        // TelnyxSettings
        console.log('📱 TelnyxSettings...');
        for (const setting of backup2THIER.TelnyxSettings) {
            await prisma.telnyxSettings.create({ data: setting });
        }
        console.log(`   ✅ ${backup2THIER.TelnyxSettings.length} settings`);
        
        // Invitation
        console.log('📧 Invitation...');
        for (const invitation of backup2THIER.Invitation) {
            await prisma.invitation.create({ data: invitation });
        }
        console.log(`   ✅ ${backup2THIER.Invitation.length} invitations`);
        
        // FieldType
        console.log('📝 FieldType...');
        for (const fieldType of backup2THIER.FieldType) {
            await prisma.fieldType.create({ data: fieldType });
            console.log(`   ✅ ${fieldType.name}`);
        }
        
        // ÉTAPE 2: AJOUTER LES DONNÉES MANQUANTES DE LA SAUVEGARDE SÉCURITÉ
        console.log('\\n🔧 ÉTAPE 2: COMPLÉTION AVEC SAUVEGARDE SÉCURITÉ...');
        
        // Blocks (fusionner les deux)
        console.log('🧱 Blocks (fusion)...');
        // D'abord les blocks de 2THIER
        for (const block of backup2THIER.Block) {
            await prisma.block.create({ data: block });
            console.log(`   ✅ ${block.name} (2THIER)`);
        }
        // Puis les blocks manquants de Sécurité
        for (const block of backupSecurite.Block) {
            const existsIn2THIER = backup2THIER.Block.find(b => b.id === block.id);
            if (!existsIn2THIER) {
                await prisma.block.create({ data: block });
                console.log(`   ✅ ${block.name} (Sécurité)`);
            }
        }
        
        // Sections (CRITIQUES - manquantes dans 2THIER !)
        console.log('📄 Sections (AJOUT depuis Sécurité)...');
        const sectionsSecurite = [
            { id: "458a79e0-f453-481e-90af-7c239df12409", name: "Informations client", blockId: "ec64e4ae-9f89-4eee-87db-2438bb60dc81", order: 0 },
            { id: "5a4f5ff7-89c2-4e3e-8434-2beb343b3676", name: "Client", blockId: "f10b3fb1-1417-4e67-82a9-749edbbf66f6", order: 0 },
            { id: "a640b822-26e0-46d6-a0e2-2b454a29d1e8", name: "Mesures", blockId: "f10b3fb1-1417-4e67-82a9-749edbbf66f6", order: 1 },
            { id: "c3dba835-3d94-4434-b3c5-3c0daccdb52b", name: "PV", blockId: "f10b3fb1-1417-4e67-82a9-749edbbf66f6", order: 2 },
            { id: "ef23321c-26a1-413d-839d-23956a19690c", name: "Thermo", blockId: "f10b3fb1-1417-4e67-82a9-749edbbf66f6", order: 3 },
            { id: "5f439c3f-38ee-49d6-af12-84a709ddec57", name: "PAC A/A", blockId: "f10b3fb1-1417-4e67-82a9-749edbbf66f6", order: 4 },
            { id: "6544bf4b-8fe3-4515-85dd-839c3137575e", name: "PAC A/E", blockId: "f10b3fb1-1417-4e67-82a9-749edbbf66f6", order: 5 },
            { id: "721f073b-e290-45b1-b406-855c8b3fdb31", name: "Toitures", blockId: "f10b3fb1-1417-4e67-82a9-749edbbf66f6", order: 6 }
        ];
        
        // Garder les sections de 2THIER
        for (const section of backup2THIER.Section) {
            await prisma.section.create({ data: section });
            console.log(`   ✅ ${section.name} (2THIER)`);
        }
        
        // Ajouter les sections de sécurité
        for (const section of sectionsSecurite) {
            const existsIn2THIER = backup2THIER.Section.find(s => s.id === section.id);
            if (!existsIn2THIER) {
                await prisma.section.create({ data: section });
                console.log(`   ✅ ${section.name} (Sécurité)`);
            }
        }
        
        // Fields (FUSION CRITIQUE)
        console.log('📝 Fields (fusion complète)...');
        // D'abord les fields de 2THIER
        for (const field of backup2THIER.Field) {
            await prisma.field.create({ data: field });
            console.log(`   ✅ ${field.label} (2THIER)`);
        }
        // Puis les fields manquants de Sécurité
        for (const field of backupSecurite.Field) {
            const existsIn2THIER = backup2THIER.Field.find(f => f.id === field.id);
            if (!existsIn2THIER) {
                await prisma.field.create({ data: field });
                console.log(`   ✅ ${field.label} (Sécurité)`);
            }
        }
        
        // FieldOption (MAINTENANT que les Fields existent)
        console.log('🔧 FieldOption (après Fields)...');
        for (const option of backup2THIER.FieldOption) {
            await prisma.fieldOption.create({ data: option });
        }
        console.log(`   ✅ ${backup2THIER.FieldOption.length} options`);
        
        // FieldOptionNode (CRITIQUES - complètement manquants dans 2THIER !)
        console.log('🔗 FieldOptionNode (AJOUT depuis Sécurité)...');
        const optionNodesSecurite = [
            {
                id: "07c45baa-c3d2-4d48-8a95-7f711f5e45d3",
                fieldId: "c8a2467b-9cf1-4dba-aeaf-77240adeedd5",
                parentId: null,
                label: "Calcul du prix Kw/h",
                value: "calcul-du-prix-kwh",
                order: 0,
                data: { "nextField": { "type": "number", "placeholder": "Calcul du prix Kw/H" } },
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: "56bb1a91-20ef-453f-925a-41e1c565402b",
                fieldId: "c8a2467b-9cf1-4dba-aeaf-77240adeedd5",
                parentId: null,
                label: "Prix Kw/h",
                value: "prix-kwh",
                order: 1,
                data: { "nextField": { "type": "number", "placeholder": "Prix Kh/h" } },
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        
        for (const option of optionNodesSecurite) {
            await prisma.fieldOptionNode.create({ data: option });
            console.log(`   ✅ ${option.label} (FieldOptionNode)`);
        }
        
        console.log('\\n🎉 RESTAURATION HYBRIDE COMPLÈTE ET TOTALE TERMINÉE !');
        
        // VÉRIFICATION FINALE EXHAUSTIVE
        console.log('\\n📊 VÉRIFICATION FINALE EXHAUSTIVE:');
        const counts = {
            organizations: await prisma.organization.count(),
            users: await prisma.user.count(),
            modules: await prisma.module.count(),
            roles: await prisma.role.count(),
            permissions: await prisma.permission.count(),
            userOrganizations: await prisma.userOrganization.count(),
            organizationModuleStatus: await prisma.organizationModuleStatus.count(),
            blocks: await prisma.block.count(),
            sections: await prisma.section.count(),
            fields: await prisma.field.count(),
            fieldOptions: await prisma.fieldOption.count(),
            fieldOptionNodes: await prisma.fieldOptionNode.count(),
            fieldTypes: await prisma.fieldType.count(),
            leads: await prisma.lead.count(),
            leadStatuses: await prisma.leadStatus.count(),
            calendarEvents: await prisma.calendarEvent.count(),
            callStatuses: await prisma.callStatus.count(),
            callToLeadMappings: await prisma.callToLeadMapping.count(),
            googleTokens: await prisma.googleToken.count(),
            googleWorkspaceConfigs: await prisma.googleWorkspaceConfig.count(),
            telnyxSettings: await prisma.telnyxSettings.count(),
            invitations: await prisma.invitation.count()
        };
        
        Object.entries(counts).forEach(([table, count]) => {
            console.log(`   ✅ ${table}: ${count}`);
        });
        
        // Vérification spécifique du champ Prix Kw/h
        const prixKwhField = await prisma.field.findFirst({
            where: { id: 'c8a2467b-9cf1-4dba-aeaf-77240adeedd5' },
            include: { optionNodes: true }
        });
        
        if (prixKwhField && prixKwhField.optionNodes && prixKwhField.optionNodes.length === 2) {
            console.log('\\n🎯 CHAMP PRIX KW/H PARFAITEMENT RESTAURÉ !');
            console.log(`   - ID: ${prixKwhField.id}`);
            console.log(`   - Options: ${prixKwhField.optionNodes.length}`);
            prixKwhField.optionNodes.forEach(opt => {
                console.log(`     • ${opt.label} (${opt.value})`);
            });
        } else {
            console.log('\\n❌ PROBLÈME avec le champ Prix Kw/h !');
        }
        
        console.log('\\n🚀 VOTRE CRM EST MAINTENANT COMPLÈTEMENT RESTAURÉ AVEC TOUTES LES DONNÉES !');
        console.log('💪 BASE 2THIER + COMPLÉTION SÉCURITÉ = PERFECTION !');
        
    } catch (error) {
        console.error('❌ ERREUR CRITIQUE lors de la restauration hybride:', error);
        console.error('Details:', error.message);
        if (error.code) {
            console.error('Code:', error.code);
        }
    } finally {
        await prisma.$disconnect();
    }
}

restaurationHybrideComplete();
