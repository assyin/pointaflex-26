"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getManagerLevel = getManagerLevel;
exports.getManagedEmployeeIds = getManagedEmployeeIds;
async function getManagerLevel(prisma, userId, tenantId) {
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
            departmentId: managedDepartments[0].id,
        };
    }
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
        return {
            type: 'SITE',
            siteId: siteManagements[0].siteId,
            departmentId: siteManagements[0].departmentId,
        };
    }
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
            teamId: managedTeams[0].id,
        };
    }
    return { type: null };
}
async function getManagedEmployeeIds(prisma, managerLevel, tenantId) {
    if (!managerLevel.type) {
        return [];
    }
    const where = { tenantId, isActive: true };
    switch (managerLevel.type) {
        case 'DEPARTMENT':
            where.departmentId = managerLevel.departmentId;
            break;
        case 'SITE':
            where.siteId = managerLevel.siteId;
            if (managerLevel.departmentId) {
                where.departmentId = managerLevel.departmentId;
            }
            else {
                const site = await prisma.site.findUnique({
                    where: { id: managerLevel.siteId },
                    select: { departmentId: true },
                });
                if (site?.departmentId) {
                    where.departmentId = site.departmentId;
                }
                else {
                    return [];
                }
            }
            break;
        case 'TEAM':
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
//# sourceMappingURL=manager-level.util.js.map