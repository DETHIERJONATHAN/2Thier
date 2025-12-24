import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Hash du mot de passe "password" pour le développement
const DEV_PASSWORD_HASH = bcrypt.hashSync('password', 10);

function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Objectifs du seed:
 * - Unifier l'organisation: "2Thier CRM"
 * - Garantir deux super admins: dethier.jls@gmail.com & jonathan.dethier@2thier.be
 * - Créer un rôle "super_admin" (Role table) et lier via UserOrganization
 * - Mettre user.role = 'super_admin' pour compatibilité logique applicative
 * - Purger les leads de cette organisation et créer 2 leads complets cohérents
 */
async function main() {
  console.log('🚀 Seed démarré');

  // 1. Organisation cible
  const ORG_NAME = '2Thier CRM';
  let org = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        id: generateId(),
        name: ORG_NAME,
        description: 'Organisation principale CRM',
        website: 'https://www.2thier.com',
        phone: '+32 470 00 00 00',
        updatedAt: new Date()
      }
    });
    console.log('🏢 Organisation créée:', org.id);
  } else {
    console.log('🏢 Organisation existante:', org.id);
  }

  // 2. Rôle super_admin (Role table)
  let superAdminRole = await prisma.role.findFirst({
    where: { name: 'super_admin', organizationId: org.id }
  });
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        id: generateId(),
        name: 'super_admin',
        label: 'Super Administrateur',
        description: 'Accès total à toutes les fonctionnalités',
        organizationId: org.id,
        updatedAt: new Date()
      }
    });
    console.log('🔐 Rôle super_admin créé');
  } else {
    console.log('🔐 Rôle super_admin existant');
  }

  // 3. Utilisateurs cibles
  const usersSeed = [
    {
      email: 'dethier.jls@gmail.com',
      firstName: 'Jonathan',
      lastName: 'Dethier'
    },
    {
      email: 'jonathan.dethier@2thier.be',
      firstName: 'Jonathan',
      lastName: 'Dethier'
    }
  ];

  const ensuredUsers: { id: string; email: string }[] = [];
  for (const u of usersSeed) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: generateId(),
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          // Hash bcrypt du mot de passe "password" pour le développement
          passwordHash: DEV_PASSWORD_HASH,
          role: 'super_admin',
          updatedAt: new Date()
        }
      });
      console.log('👤 Utilisateur créé:', u.email);
    } else if (user.role !== 'super_admin' || !user.passwordHash?.startsWith('$2')) {
      // Mettre à jour le rôle ET le passwordHash si c'est un placeholder
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          role: 'super_admin',
          passwordHash: DEV_PASSWORD_HASH 
        }
      });
      console.log('👤 Rôle/password mis à jour -> super_admin:', u.email);
    } else {
      console.log('👤 Utilisateur déjà présent:', u.email);
    }
    ensuredUsers.push({ id: user.id, email: user.email });

    // Lien UserOrganization
    const link = await prisma.userOrganization.findFirst({
      where: { userId: user.id, organizationId: org.id }
    });
    if (!link) {
      await prisma.userOrganization.create({
        data: {
          id: generateId(),
          userId: user.id,
          organizationId: org.id,
          roleId: superAdminRole.id,
          updatedAt: new Date()
        }
      });
      console.log('🔗 Liaison user/org créée pour', u.email);
    }
  }

  // 4. Statut de lead par défaut
  let defaultStatus = await prisma.leadStatus.findFirst({
    where: { organizationId: org.id, isDefault: true }
  });
  if (!defaultStatus) {
    defaultStatus = await prisma.leadStatus.create({
      data: {
        id: generateId(),
        name: 'Nouveau',
        color: '#1890ff',
        order: 1,
        isDefault: true,
        organizationId: org.id,
        updatedAt: new Date()
      }
    });
    console.log('🆕 Statut par défaut créé');
  } else {
    console.log('🆕 Statut par défaut existant');
  }

  // 5. Purger les leads de l'organisation
  await prisma.lead.deleteMany({ where: { organizationId: org.id } });
  console.log('🧹 Leads existants supprimés pour cette organisation');

  // 6. Créer 2 leads complets
  const assignUser1 = ensuredUsers[0];
  const assignUser2 = ensuredUsers[1] || ensuredUsers[0];

  const leadPayloadCommon = () => ({
    id: generateId(),
    status: 'new',
    statusId: defaultStatus!.id,
    organizationId: org.id,
    lastContactDate: faker.date.recent({ days: 10 }),
    nextFollowUpDate: faker.date.soon({ days: 15 }),
    notes: faker.lorem.sentences(3),
    website: faker.internet.url(),
    linkedin: `https://linkedin.com/in/${faker.helpers.slugify(faker.person.fullName()).toLowerCase()}`,
    updatedAt: new Date()
  });

  const leadA = await prisma.lead.create({
    data: {
      ...leadPayloadCommon(),
      firstName: 'Claire',
      lastName: 'Martin',
      email: 'claire.martin.pro@example.com',
      phone: '+33 6 11 22 33 44',
      company: 'Nova Digital',
      source: 'Site Web',
      assignedToId: assignUser1.id,
      data: {
        name: 'Claire Martin',
        email: 'claire.martin.pro@example.com',
        phone: '+33 6 11 22 33 44',
        company: 'Nova Digital',
        industry: 'SaaS',
        companySize: 42,
        budgetRange: '10k-25k',
        maturity: 'Evaluation',
        painPoints: ['Automatisation', 'Intégration CRM'],
        address: {
          street: '12 Rue des Lilas',
          city: 'Lyon',
          zipCode: '69003',
          country: 'France'
        },
        website: 'https://novadigital.example.com'
      }
    }
  });

  const leadB = await prisma.lead.create({
    data: {
      ...leadPayloadCommon(),
      firstName: 'Marc',
      lastName: 'Dubois',
      email: 'marc.dubois@example.com',
      phone: '+32 478 55 66 77',
      company: 'Green Factory',
      source: 'Partenaire',
      assignedToId: assignUser2.id,
      data: {
        name: 'Marc Dubois',
        email: 'marc.dubois@example.com',
        phone: '+32 478 55 66 77',
        company: 'Green Factory',
        industry: 'Énergie',
        companySize: 120,
        projectType: 'Refonte CRM',
        urgency: 'Moyenne',
        budgetRange: '25k-50k',
        timeline: 'Q4 2025',
        address: {
          street: '5 Avenue Centrale',
          city: 'Bruxelles',
          zipCode: '1000',
          country: 'Belgique'
        },
        technologies: ['Node.js', 'Prisma', 'React'],
        website: 'https://greenfactory.example.com'
      }
    }
  });

  console.log('✅ Leads créés:', { leadA: leadA.id, leadB: leadB.id });
  console.log('🎉 Seed terminé avec succès');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erreur seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
