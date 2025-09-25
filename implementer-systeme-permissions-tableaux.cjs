const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function implementerSystemePermissionsTableaux() {
    console.log('🔐 IMPLÉMENTATION SYSTÈME PERMISSIONS TABLEAUX\n');

    try {
        // 1. Créer les permissions spécifiques pour les tableaux
        console.log('📋 Étape 1 : Création des permissions tableaux...');
        
        // Trouver le module existant ou en créer un pour les tableaux
        let moduleTableaux = await prisma.module.findFirst({
            where: { key: 'tableaux' }
        });

        if (!moduleTableaux) {
            moduleTableaux = await prisma.module.create({
                data: {
                    key: 'tableaux',
                    label: 'Gestion des Tableaux',
                    feature: 'tableaux',
                    icon: 'table',
                    route: '/tableaux',
                    description: 'Gestion des tableaux de données (création, modification, utilisation)',
                    page: 'TableauxPage',
                    order: 15,
                    active: true
                }
            });
            console.log(`✅ Module Tableaux créé (ID: ${moduleTableaux.id})`);
        } else {
            console.log(`✅ Module Tableaux existant (ID: ${moduleTableaux.id})`);
        }

        // 2. Définir les actions spécifiques aux tableaux
        const actionsTableaux = [
            {
                action: 'create_structure',
                resource: 'tableau',
                description: 'Créer la structure de base des tableaux (colonnes, configuration)'
            },
            {
                action: 'edit_structure',
                resource: 'tableau',
                description: 'Modifier la structure des tableaux (ajouter/supprimer colonnes)'
            },
            {
                action: 'manage_data',
                resource: 'tableau',
                description: 'Gérer les données des tableaux (ajouter/modifier/supprimer lignes)'
            },
            {
                action: 'use_data',
                resource: 'tableau',
                description: 'Utiliser les données des tableaux (sélection dans formulaires/devis)'
            },
            {
                action: 'export_data',
                resource: 'tableau',
                description: 'Exporter les données des tableaux'
            },
            {
                action: 'import_data',
                resource: 'tableau',
                description: 'Importer des données dans les tableaux'
            }
        ];

        // 3. Récupérer tous les rôles pour attribution des permissions
        const roles = await prisma.role.findMany();
        console.log(`📊 ${roles.length} rôles trouvés`);

        // 4. Attribution des permissions selon les rôles
        for (const role of roles) {
            console.log(`\n🔐 Configuration permissions pour rôle: ${role.name} (${role.label})`);
            
            let permissionsAAttribuer = [];

            // SUPER ADMIN : Toutes les permissions
            if (role.name === 'super_admin') {
                permissionsAAttribuer = actionsTableaux.map(action => action.action);
                console.log('   👑 Super Admin → TOUTES les permissions tableaux');
            }
            
            // ADMIN : Gestion des données mais pas structure
            else if (role.name === 'admin' || role.label?.toLowerCase().includes('admin')) {
                permissionsAAttribuer = [
                    'manage_data',    // Peut modifier les données
                    'use_data',       // Peut utiliser les tableaux
                    'export_data',    // Peut exporter
                    'import_data'     // Peut importer
                ];
                console.log('   👨‍💼 Admin → Gestion données + utilisation');
            }
            
            // UTILISATEUR STANDARD : Utilisation uniquement
            else {
                permissionsAAttribuer = [
                    'use_data'        // Peut seulement utiliser les tableaux existants
                ];
                console.log('   👤 Utilisateur → Utilisation uniquement');
            }

            // Créer les permissions pour ce rôle
            for (const actionName of permissionsAAttribuer) {
                const actionInfo = actionsTableaux.find(a => a.action === actionName);
                if (!actionInfo) continue;

                try {
                    await prisma.permission.create({
                        data: {
                            roleId: role.id,
                            organizationId: role.organizationId,
                            moduleId: moduleTableaux.id,
                            action: actionInfo.action,
                            resource: actionInfo.resource,
                            allowed: true
                        }
                    });
                    console.log(`     ✅ Permission "${actionInfo.action}" accordée`);
                } catch (error) {
                    if (error.code === 'P2002') {
                        console.log(`     ⚠️  Permission "${actionInfo.action}" existe déjà`);
                    } else {
                        throw error;
                    }
                }
            }
        }

        // 5. Mettre à jour la configuration des FieldTypes avec les permissions
        console.log('\n🔧 Étape 2 : Mise à jour configuration FieldType avec permissions...');
        
        const fieldTypeConfig = await prisma.fieldType.findUnique({
            where: { name: 'tableau' },
            select: { config: true }
        });

        const enhancedConfig = {
            ...fieldTypeConfig.config,
            permissions: {
                description: 'Système de permissions pour les tableaux',
                levels: {
                    super_admin: {
                        formulaire: ['create_structure', 'edit_structure'],
                        devis: ['manage_data', 'use_data', 'export_data', 'import_data'],
                        description: 'Accès complet : création et modification complète'
                    },
                    admin: {
                        formulaire: [], // Pas de modification de structure
                        devis: ['manage_data', 'use_data', 'export_data', 'import_data'],
                        description: 'Gestion des données dans les devis uniquement'
                    },
                    user: {
                        formulaire: [], // Pas d\'accès à la configuration
                        devis: ['use_data'], // Sélection uniquement
                        description: 'Utilisation des tableaux existants uniquement'
                    }
                },
                workflow: {
                    creation: 'super_admin crée la structure de base dans formulaire',
                    adaptation: 'admin peut modifier les données dans devis',
                    utilisation: 'user peut sélectionner dans les tableaux existants'
                }
            },
            uiControls: {
                showEditButton: {
                    condition: 'hasPermission("manage_data")',
                    context: 'devis'
                },
                showAddRowButton: {
                    condition: 'hasPermission("manage_data")',
                    context: 'devis'
                },
                showDeleteRowButton: {
                    condition: 'hasPermission("manage_data")',
                    context: 'devis'
                },
                showExportButton: {
                    condition: 'hasPermission("export_data")',
                    context: 'devis'
                },
                showImportButton: {
                    condition: 'hasPermission("import_data")',
                    context: 'devis'
                },
                showStructureEditor: {
                    condition: 'hasPermission("edit_structure")',
                    context: 'formulaire'
                }
            }
        };

        await prisma.fieldType.update({
            where: { name: 'tableau' },
            data: {
                config: enhancedConfig,
                updatedAt: new Date()
            }
        });

        console.log('✅ Configuration FieldType mise à jour avec permissions');

        // 6. Créer un exemple de tableau avec permissions par défaut
        console.log('\n📊 Étape 3 : Création tableau exemple avec permissions...');
        
        const section = await prisma.section.findFirst();
        if (section) {
            const tableauAvecPermissions = await prisma.field.create({
                data: {
                    label: 'Tableau avec Permissions',
                    type: 'tableau',
                    sectionId: section.id,
                    order: 300,
                    required: false,
                    width: '1/1',
                    advancedConfig: {
                        tableType: 'products',
                        tableConfig: {
                            name: 'Exemple avec Permissions',
                            description: 'Tableau démontrant le système de permissions',
                            
                            columns: [
                                {
                                    id: 'nom',
                                    key: 'nom',
                                    label: 'Nom Produit',
                                    type: 'text',
                                    isRowHeader: true,
                                    searchable: true,
                                    width: '200px',
                                    permissions: {
                                        edit: ['super_admin', 'admin'],
                                        view: ['super_admin', 'admin', 'user']
                                    }
                                },
                                {
                                    id: 'prix',
                                    key: 'prix',
                                    label: 'Prix',
                                    type: 'currency',
                                    currency: 'EUR',
                                    width: '100px',
                                    permissions: {
                                        edit: ['super_admin', 'admin'],
                                        view: ['super_admin', 'admin', 'user']
                                    }
                                },
                                {
                                    id: 'marge',
                                    key: 'marge',
                                    label: 'Marge (%)',
                                    type: 'percentage',
                                    width: '100px',
                                    permissions: {
                                        edit: ['super_admin'],
                                        view: ['super_admin', 'admin'] // Utilisateurs ne voient pas la marge
                                    }
                                }
                            ],
                            
                            rows: [
                                {
                                    id: 'produit_1',
                                    label: 'Produit Standard',
                                    permissions: {
                                        edit: ['super_admin', 'admin'],
                                        delete: ['super_admin'],
                                        view: ['super_admin', 'admin', 'user']
                                    },
                                    data: {
                                        nom: 'Produit Standard',
                                        prix: 150.00,
                                        marge: 25.0
                                    }
                                }
                            ],
                            
                            // Permissions globales du tableau
                            permissions: {
                                create_row: ['super_admin', 'admin'],
                                delete_row: ['super_admin'],
                                edit_data: ['super_admin', 'admin'],
                                view_data: ['super_admin', 'admin', 'user'],
                                export_data: ['super_admin', 'admin'],
                                import_data: ['super_admin', 'admin'],
                                edit_structure: ['super_admin']
                            },
                            
                            uiConfig: {
                                showAddButton: {
                                    roles: ['super_admin', 'admin'],
                                    context: 'devis'
                                },
                                showEditButton: {
                                    roles: ['super_admin', 'admin'],
                                    context: 'devis'
                                },
                                showDeleteButton: {
                                    roles: ['super_admin'],
                                    context: 'devis'
                                }
                            }
                        }
                    }
                }
            });
            
            console.log(`✅ Tableau avec permissions créé (ID: ${tableauAvecPermissions.id})`);
        }

        // 7. Documentation du système de permissions
        console.log('\n📚 DOCUMENTATION SYSTÈME PERMISSIONS TABLEAUX :');
        
        console.log('\n👑 SUPER ADMIN (Formulaire) :');
        console.log('   • Crée la structure complète des tableaux');
        console.log('   • Définit colonnes, types, validations');
        console.log('   • Configure le conditionnement');
        console.log('   • Établit les templates par défaut');
        console.log('   • Accès complet à tout');
        
        console.log('\n👨‍💼 ADMIN (Devis) :');
        console.log('   • Utilise les tableaux créés par Super Admin');
        console.log('   • Peut modifier les données (prix, disponibilité)');
        console.log('   • Peut ajouter/supprimer des lignes');
        console.log('   • Peut exporter/importer des données');
        console.log('   • CANNOT modifier la structure (colonnes, types)');
        
        console.log('\n👤 UTILISATEUR (Devis) :');
        console.log('   • Peut seulement SÉLECTIONNER dans les tableaux');
        console.log('   • Voit les données autorisées');
        console.log('   • CANNOT modifier quoi que ce soit');
        console.log('   • Interface en lecture seule');
        
        console.log('\n🔧 CONTRÔLES UI AUTOMATIQUES :');
        console.log('   • Boutons d\'édition selon les permissions');
        console.log('   • Colonnes masquées selon le rôle');
        console.log('   • Actions contextuelles selon l\'utilisateur');
        console.log('   • Messages d\'erreur si pas d\'autorisation');
        
        console.log('\n🚀 WORKFLOW COMPLET :');
        console.log('   1. Super Admin configure tableaux dans Formulaire');
        console.log('   2. Admin adapte données dans Devis selon projets');
        console.log('   3. Utilisateur sélectionne dans tableaux finalisés');
        console.log('   4. Système respecte permissions automatiquement');

        console.log('\n✅ SYSTÈME DE PERMISSIONS TABLEAUX OPÉRATIONNEL !');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

implementerSystemePermissionsTableaux();
