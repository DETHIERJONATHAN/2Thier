declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        userId: string;
        role: string;
        organizationId: string | null;
        roles?: string[];
        firstname?: string;
        lastname?: string;
        email?: string;
        isSuperAdmin?: boolean;
      };
      originalUser?: { userId: string; role: string };
      impersonatedUser?: { id: string };
      impersonatedOrganizationId?: string;
      accessibleOrgIds?: string[];
    }
  }
}

export {};
