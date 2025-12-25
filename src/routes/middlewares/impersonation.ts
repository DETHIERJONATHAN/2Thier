import type { Request as ExpressRequest, Response, NextFunction } from 'express';
import { db } from '../../lib/database';
import type { AuthenticatedRequest } from './auth';

const prisma = db;

export async function impersonationMiddleware(
  req: ExpressRequest,
  res: Response,
  next: NextFunction
) {
  const authReq = req as AuthenticatedRequest;
  const impersonateUserId = authReq.headers["x-impersonate-user-id"] as string;
  const impersonateOrgId = authReq.headers["x-impersonate-org-id"] as string;
  const originalUser = authReq.user;

  // Le middleware ne fait rien si l'utilisateur n'est pas un super_admin
  // ou si aucun en-tête d'usurpation n'est fourni.
  if (
    !originalUser ||
    originalUser.role !== "super_admin" ||
    (!impersonateUserId && !impersonateOrgId)
  ) {
    return next();
  }

  console.log(
    `[Impersonation] Middleware triggered for super_admin ${originalUser.userId}. Headers: user=${impersonateUserId}, org=${impersonateOrgId}`
  );

  try {
    // Cas 1 : Usurpation d'un utilisateur (et potentiellement d'une organisation)
    if (impersonateUserId) {
      const userToImpersonate = await prisma.user.findUnique({
        where: { id: impersonateUserId },
      });

      if (!userToImpersonate) {
        // Si l'utilisateur n'est pas trouvé, on ne peut pas continuer.
        return res
          .status(404)
          .json({ error: "Utilisateur à usurper non trouvé." });
      }
      // Stocker l'objet utilisateur complet pour un usage ultérieur (ex: /api/me)
      authReq.impersonatedUser = userToImpersonate;
      // L'organisation à usurper est soit celle fournie, soit nulle pour le moment.
      authReq.impersonatedOrganizationId = impersonateOrgId;

      console.log(
        `[Impersonation] Stored impersonatedUser: ${authReq.impersonatedUser.id}`
      );
    } else if (impersonateOrgId) {
      // Cas 2 : Le super_admin agit dans le contexte d'une seule organisation
      // sans changer d'identité utilisateur.
      authReq.impersonatedOrganizationId = impersonateOrgId;
    }

    if (authReq.impersonatedOrganizationId) {
      console.log(
        `[Impersonation] Stored impersonatedOrganizationId: ${authReq.impersonatedOrganizationId}`
      );
    }

    next();
  } catch (error) {
    console.error("[Impersonation] Erreur:", error);
    res
      .status(500)
      .json({ error: "Une erreur est survenue durant l'usurpation." });
  }
}
