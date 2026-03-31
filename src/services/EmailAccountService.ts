import prisma from '../prisma.js';
import bcrypt from 'bcryptjs';
import { getPostalService } from './PostalEmailService.js';

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

/** Domaine natif Postal (zhiive.com) si configuré */
const DEFAULT_EMAIL_DOMAIN = process.env.DEFAULT_EMAIL_DOMAIN || '';

/**
 * Crée ou met à jour un compte e-mail pour un utilisateur donné.
 * Si DEFAULT_EMAIL_DOMAIN est configuré → crée un compte Postal natif (@zhiive.com).
 * Sinon → ancien comportement (domaine basé sur l'organisation).
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

  // ─── Déterminer le domaine et le provider ───
  const usePostal = !!DEFAULT_EMAIL_DOMAIN && !!process.env.POSTAL_API_URL;
  const domain = usePostal
    ? DEFAULT_EMAIL_DOMAIN
    : (organization.name === '2thier' ? '2thier.be' : `${normalizeStringForEmail(organization.name)}.be`);
  
  const localPart = `${normalizeStringForEmail(user.firstName)}.${normalizeStringForEmail(user.lastName)}`;
  const emailAddress = `${localPart}@${domain}`;

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

  // Créer le compte email en DB
  const emailAccount = await prisma.emailAccount.create({
    data: {
      emailAddress,
      encryptedPassword,
      userId: user.id,
      organizationId: organization.id,
      mailProvider: usePostal ? 'postal' : undefined,
    },
  });

  // ─── Provisioning Postal : créer la boîte mail sur le serveur ───
  if (usePostal) {
    try {
      const postal = getPostalService();
      await postal.createMailbox(emailAddress, `${user.firstName} ${user.lastName}`);
      console.log(`📬 [POSTAL] Boîte mail provisionnée: ${emailAddress}`);
    } catch (error) {
      // Log l'erreur mais ne bloque pas la création du compte
      // L'admin pourra reprovisionner manuellement si nécessaire
      console.error(`⚠️ [POSTAL] Erreur provisioning boîte mail ${emailAddress}:`, error);
    }
  }

  console.log("Compte email créé :", {
    emailAddress,
    provider: usePostal ? 'postal' : 'legacy',
    temporaryPassword: usePostal ? '(géré par Postal)' : temporaryPassword,
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