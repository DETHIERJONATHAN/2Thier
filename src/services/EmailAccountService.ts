import prisma from '../prisma.js';
import bcrypt from 'bcrypt';

/**
 * Normalise une chaîne de caractères pour être utilisée dans une adresse e-mail.
 * Supprime les accents, convertit en minuscules et remplace les espaces par des tirets.
 * @param str La chaîne à normaliser.
 * @returns La chaîne normalisée.
 */
const normalizeStringForEmail = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD") // Sépare les caractères et les accents
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/[^a-z0-9-]/g, ''); // Garde seulement lettres, chiffres et tirets
};

/**
 * Crée ou met à jour un compte e-mail pour un utilisateur donné.
 * Génère l'adresse e-mail, chiffre le mot de passe et sauvegarde dans la base de données.
 * @param userId L'ID de l'utilisateur pour lequel créer le compte.
 * @returns Le compte e-mail créé ou mis à jour.
 */
export const createOrUpdateEmailAccount = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      UserOrganization: {
        include: {
          Organization: true
        },
      },
      emailAccount: true, // Inclure le compte email existant
    },
  });

  if (!user || !user.firstName || !user.lastName || !user.passwordHash) {
    throw new Error("Données utilisateur incomplètes pour créer un compte email.");
  }

  const userOrg = user.UserOrganization[0];
  if (!userOrg || !userOrg.Organization) {
    throw new Error("L'utilisateur n'est associé à aucune organisation valide.");
  }
  const organization = userOrg.Organization;

  // Si l'utilisateur a déjà un compte email, le retourner
  if (user.emailAccount) {
    return user.emailAccount;
  }

  // Générer le domaine email
  const domain = organization.name === '2thier' ? '2thier.be' : `${normalizeStringForEmail(organization.name)}.be`;
  
  const emailAddress = `${normalizeStringForEmail(user.firstName)}.${normalizeStringForEmail(user.lastName)}@${domain}`;

  // Vérifier/Créer le domaine email
  await prisma.emailDomain.upsert({
    where: { domain },
    update: {},
    create: {
      domain,
      organizationId: organization.id,
    },
  });

  // Générer un mot de passe temporaire
  const temporaryPassword = generateTemporaryPassword();
  const encryptedPassword = await bcrypt.hash(temporaryPassword, 10);

  // Créer le compte email
  const emailAccount = await prisma.emailAccount.create({
    data: {
      emailAddress,
      encryptedPassword,
      userId: user.id,
      organizationId: organization.id,
    },
  });

  console.log("Compte email créé :", {
    emailAddress,
    temporaryPassword: temporaryPassword, // À transmettre à l'utilisateur de manière sécurisée
  });

  return emailAccount;
};

/**
 * Récupère le compte email d'un utilisateur
 */
export const getUserEmailAccount = async (userId: string) => {
  return await prisma.emailAccount.findUnique({
    where: { userId },
    include: {
      user: true,
      organization: true,
    },
  });
};

/**
 * Génère un mot de passe temporaire sécurisé
 */
const generateTemporaryPassword = (): string => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
};