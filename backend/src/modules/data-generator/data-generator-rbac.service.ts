import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { RBACConfigDto } from './dto/generate-all-data.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DataGeneratorRBACService {
  private readonly logger = new Logger(DataGeneratorRBACService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DataGeneratorOrchestratorService))
    private readonly orchestrator: DataGeneratorOrchestratorService,
  ) {}

  /**
   * Génère les utilisateurs avec rôles RBAC
   * Retourne les informations des utilisateurs créés (email, mot de passe)
   */
  async generateUsers(tenantId: string, config: RBACConfigDto): Promise<{
    count: number;
    users: Array<{
      email: string;
      password: string;
      role: string;
      firstName: string;
      lastName: string;
    }>;
  }> {
    this.logger.log(`👤 Génération des utilisateurs avec RBAC pour tenant ${tenantId}`);

    const usersPerRole = config.usersPerRole || {
      SUPER_ADMIN: 1,
      ADMIN_RH: 1,
      MANAGER: 3,
      EMPLOYEE: 10,
    };

    let totalCreated = 0;
    const defaultPasswordPlain = 'Password123!'; // Mot de passe en clair pour affichage
    const defaultPassword = await bcrypt.hash(defaultPasswordPlain, 10); // Mot de passe hashé pour la base
    const createdUsers: Array<{
      email: string;
      password: string;
      role: string;
      firstName: string;
      lastName: string;
    }> = [];

    // Générer les utilisateurs par rôle
    for (const [roleName, count] of Object.entries(usersPerRole)) {
      // Trouver le rôle RBAC correspondant
      const role = await this.prisma.role.findFirst({
        where: {
          OR: [
            { tenantId: null, name: roleName }, // Rôle système
            { tenantId, name: roleName }, // Rôle personnalisé
          ],
        },
      });

      if (!role) {
        this.logger.warn(`⚠️ Rôle ${roleName} non trouvé, ignoré`);
        continue;
      }

      const countNum = Number(count);
      for (let i = 0; i < countNum; i++) {
        const firstName = this.generateFirstName();
        const lastName = this.generateLastName();
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 0 ? i : ''}@test.local`;

        // Vérifier si l'utilisateur existe déjà
        const existing = await this.prisma.user.findUnique({
          where: { email },
        });

        if (!existing) {
          const user = await this.prisma.user.create({
            data: {
              email,
              password: defaultPassword,
              firstName,
              lastName,
              tenantId,
              role: roleName as any, // Legacy role pour compatibilité
              isActive: true,
            },
          });

          // Créer la liaison UserTenantRole
          await this.prisma.userTenantRole.create({
            data: {
              userId: user.id,
              tenantId,
              roleId: role.id,
            },
          });

          // Ajouter les informations de l'utilisateur créé
          createdUsers.push({
            email,
            password: defaultPasswordPlain,
            role: roleName,
            firstName,
            lastName,
          });

          totalCreated++;
          this.orchestrator.incrementEntityCount('User');
          this.orchestrator.incrementEntityCount('UserTenantRole');
        } else {
          this.logger.log(`⏭️ Utilisateur ${email} existe déjà, ignoré`);
        }
      }

      this.logger.log(`✅ ${count} utilisateurs avec rôle ${roleName} traités`);
    }

    this.logger.log(`✅ Total: ${totalCreated} utilisateurs créés`);
    return {
      count: totalCreated,
      users: createdUsers,
    };
  }

  /**
   * Génère des rôles personnalisés
   */
  async generateCustomRoles(tenantId: string, customRoles: Array<{
    name: string;
    description?: string;
    permissions: string[];
  }>): Promise<number> {
    this.logger.log(`🎭 Génération de ${customRoles.length} rôles personnalisés`);

    let created = 0;

    for (const roleData of customRoles) {
      // Vérifier si le rôle existe déjà
      const existing = await this.prisma.role.findFirst({
        where: {
          tenantId,
          name: roleData.name,
        },
      });

      if (!existing) {
        const role = await this.prisma.role.create({
          data: {
            tenantId,
            name: roleData.name,
            code: roleData.name.toUpperCase().replace(/\s+/g, '_'), // Générer un code à partir du nom
            description: roleData.description || undefined,
            isSystem: false,
            isActive: true,
          },
        });

        // Assigner les permissions
        for (const permissionName of roleData.permissions) {
          const permission = await this.prisma.permission.findFirst({
            where: { name: permissionName },
          });

          if (permission) {
            await this.prisma.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId: permission.id,
              },
            });
          } else {
            this.logger.warn(`⚠️ Permission ${permissionName} non trouvée`);
          }
        }

        created++;
        this.orchestrator.incrementEntityCount('Role');
      }
    }

    this.logger.log(`✅ ${created} rôles personnalisés créés`);
    return created;
  }

  /**
   * Génère des noms prénoms réalistes (liste prédéfinie)
   */
  private generateFirstName(): string {
    const firstNames = [
      'Ahmed', 'Mohamed', 'Fatima', 'Aicha', 'Hassan', 'Said', 'Khadija', 'Laila',
      'Youssef', 'Omar', 'Zineb', 'Nadia', 'Karim', 'Samir', 'Salma', 'Sanae',
      'Mehdi', 'Bilal', 'Imane', 'Souad', 'Rachid', 'Nabil', 'Najat', 'Latifa',
      'Jean', 'Pierre', 'Marie', 'Sophie', 'Paul', 'Luc', 'Julie', 'Anne',
      'John', 'David', 'Sarah', 'Emma', 'Michael', 'James', 'Emily', 'Olivia',
    ];
    return firstNames[Math.floor(Math.random() * firstNames.length)];
  }

  /**
   * Génère des noms de famille réalistes (liste prédéfinie)
   */
  private generateLastName(): string {
    const lastNames = [
      'Alaoui', 'Benali', 'Cherkaoui', 'El Amrani', 'Fassi', 'Idrissi', 'Lamrani', 'Mansouri',
      'Naciri', 'Ouali', 'Rahmani', 'Saadi', 'Tazi', 'Zahiri', 'Bennani', 'Chraibi',
      'Dupont', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit',
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    ];
    return lastNames[Math.floor(Math.random() * lastNames.length)];
  }
}

