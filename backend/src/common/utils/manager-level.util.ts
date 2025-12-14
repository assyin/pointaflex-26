import { PrismaService } from 'src/database/prisma.service';

export interface ManagerLevel {
  type: 'DEPARTMENT' | 'SITE' | 'TEAM' | null;
  departmentId?: string; // Pour SITE: département géré par ce manager dans ce site
  siteId?: string;
  teamId?: string;
}

/**
 * Détermine le niveau hiérarchique d'un manager
 * 
 * Priorité :
 * 1. Manager de Département (si employee.department.managerId === employee.id)
 * 2. Manager de Site (si employee.site.managerId === employee.id)
 * 3. Manager d'Équipe (si employee.team.managerId === employee.id)
 * 
 * @param prisma - Instance PrismaService
 * @param userId - ID de l'utilisateur
 * @param tenantId - ID du tenant
 * @returns ManagerLevel avec le type et les IDs correspondants
 */
export async function getManagerLevel(
  prisma: PrismaService,
  userId: string,
  tenantId: string,
): Promise<ManagerLevel> {
  // Récupérer l'employé lié à l'utilisateur
  const employee = await prisma.employee.findFirst({
    where: {
      userId,
      tenantId,
    },
    select: {
      id: true,
    },
  });

  if (!employee) {
    return { type: null };
  }

  // Priorité 1: Manager de Département
  // Chercher TOUS les départements dont cet employé est le manager
  const managedDepartments = await prisma.department.findMany({
    where: {
      managerId: employee.id,
      tenantId,
    },
    select: {
      id: true,
    },
  });

  if (managedDepartments.length > 0) {
    return {
      type: 'DEPARTMENT',
      departmentId: managedDepartments[0].id,  // Utiliser le premier département trouvé
    };
  }

  // Priorité 2: Manager de Site (via SiteManager - nouveau système)
  // Chercher TOUS les sites dont cet employé est le manager régional
  const siteManagements = await prisma.siteManager.findMany({
    where: {
      managerId: employee.id,
      tenantId,
    },
    select: {
      siteId: true,
      departmentId: true,
    },
  });

  if (siteManagements.length > 0) {
    // Utiliser le premier site trouvé avec son département
    return {
      type: 'SITE',
      siteId: siteManagements[0].siteId,
      departmentId: siteManagements[0].departmentId, // Important: le département géré dans ce site
    };
  }

  // Fallback: Vérifier l'ancien système (managerId direct sur Site) pour rétrocompatibilité
  const managedSitesLegacy = await prisma.site.findMany({
    where: {
      managerId: employee.id,
      tenantId,
    },
    select: {
      id: true,
      departmentId: true,
    },
  });

  if (managedSitesLegacy.length > 0) {
    return {
      type: 'SITE',
      siteId: managedSitesLegacy[0].id,
      departmentId: managedSitesLegacy[0].departmentId || undefined,
    };
  }

  // Priorité 3: Manager d'Équipe
  // Chercher TOUTES les équipes dont cet employé est le manager
  const managedTeams = await prisma.team.findMany({
    where: {
      managerId: employee.id,
      tenantId,
    },
    select: {
      id: true,
    },
  });

  if (managedTeams.length > 0) {
    return {
      type: 'TEAM',
      teamId: managedTeams[0].id,  // Utiliser la première équipe trouvée
    };
  }

  // Si l'utilisateur n'est manager d'aucun niveau
  return { type: null };
}

/**
 * Récupère les IDs des employés que le manager peut voir selon son niveau
 * 
 * @param prisma - Instance PrismaService
 * @param managerLevel - Niveau hiérarchique du manager
 * @param tenantId - ID du tenant
 * @returns Array d'IDs d'employés
 */
export async function getManagedEmployeeIds(
  prisma: PrismaService,
  managerLevel: ManagerLevel,
  tenantId: string,
): Promise<string[]> {
  if (!managerLevel.type) {
    return [];
  }

  const where: any = { tenantId, isActive: true };

  switch (managerLevel.type) {
    case 'DEPARTMENT':
      // Manager de département : tous les employés du département, tous sites confondus
      where.departmentId = managerLevel.departmentId;
      break;

    case 'SITE':
      // Manager de site régional : uniquement les employés du site ET du département spécifique
      where.siteId = managerLevel.siteId;
      
      // Utiliser le departmentId du managerLevel (département géré par ce manager dans ce site)
      if (managerLevel.departmentId) {
        where.departmentId = managerLevel.departmentId;
      } else {
        // Fallback: Récupérer le département principal du site (ancien système)
        const site = await prisma.site.findUnique({
          where: { id: managerLevel.siteId },
          select: { departmentId: true },
        });
        
        if (site?.departmentId) {
          where.departmentId = site.departmentId;
        } else {
          // Si le site n'a pas de département principal, retourner vide
          // (un manager régional doit être lié à un département)
          return [];
        }
      }
      break;

    case 'TEAM':
      // Manager d'équipe : tous les employés de l'équipe
      where.teamId = managerLevel.teamId;
      break;

    default:
      return [];
  }

  const employees = await prisma.employee.findMany({
    where,
    select: { id: true },
  });

  return employees.map((e) => e.id);
}

