import { prisma } from '../lib/prisma';

export const getLeadStatuses = async (organizationId: string) => {
  return await prisma.leadStatus.findMany({
    where: {
      organizationId: organizationId,
    },
    orderBy: {
      label: 'asc',
    },
  });
};

export const addLeadStatus = async (data: { label: string; value: string; color: string; }, organizationId: string) => {
  const { label, value, color } = data;
  return await prisma.leadStatus.create({
    data: {
      label,
      value,
      color,
      organizationId: organizationId,
    },
  });
};

export const updateLeadStatus = async (id: string, data: { label: string; value: string; color: string; }, organizationId: string) => {
  const { label, value, color } = data;
  try {
    return await prisma.leadStatus.update({
      where: {
        id: id,
        organizationId: organizationId,
      },
      data: {
        label,
        value,
        color,
      },
    });
  } catch (error) {
    // Si le statut n'existe pas, retourner null
    console.warn('[SettingsService] Impossible de mettre à jour le statut du lead', {
      id,
      organizationId,
      error
    });
    return null;
  }
};

export const deleteLeadStatus = async (id: string, organizationId: string) => {
  return await prisma.leadStatus.delete({
    where: {
      id: id,
      organizationId: organizationId,
    },
  });
};