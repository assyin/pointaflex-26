import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { EmployeesConfigDto } from './dto/generate-all-data.dto';

@Injectable()
export class DataGeneratorEmployeeService {
  private readonly logger = new Logger(DataGeneratorEmployeeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DataGeneratorOrchestratorService))
    private readonly orchestrator: DataGeneratorOrchestratorService,
  ) {}

  /**
   * Génère les employés avec données réalistes
   */
  async generateEmployees(tenantId: string, config: EmployeesConfigDto): Promise<number> {
    this.logger.log(`👷 Génération de ${config.count || 0} employés pour tenant ${tenantId}`);

    const count = config.count || 10;
    const linkToUsers = config.linkToUsers !== false; // Par défaut true
    const assignToStructures = config.assignToStructures !== false; // Par défaut true

    // Récupérer les structures existantes
    const sites = await this.prisma.site.findMany({ where: { tenantId } });
    const departments = await this.prisma.department.findMany({ where: { tenantId } });
    const positions = await this.prisma.position.findMany({ where: { tenantId } });
    const teams = await this.prisma.team.findMany({ where: { tenantId } });
    const users = linkToUsers
      ? await this.prisma.user.findMany({
          where: { tenantId },
          include: { 
            userTenantRoles: { include: { role: true } },
            employee: true, // Inclure la relation employee pour vérifier si l'utilisateur a déjà un employé
          },
        })
      : [];

    if (assignToStructures && (sites.length === 0 || departments.length === 0 || positions.length === 0)) {
      this.logger.warn(
        '⚠️ Sites, départements ou positions manquants. Les employés seront créés sans assignation.',
      );
    }

    // Trouver le prochain index de matricule disponible
    const lastEmployee = await this.prisma.employee.findFirst({
      where: { tenantId },
      orderBy: { matricule: 'desc' },
      select: { matricule: true },
    });

    let employeeIndex = 1;
    if (lastEmployee && lastEmployee.matricule) {
      // Extraire le numéro du matricule (ex: EMP0042 -> 42)
      const match = lastEmployee.matricule.match(/\d+$/);
      if (match) {
        employeeIndex = parseInt(match[0], 10) + 1;
      }
    }

    this.logger.log(`📝 Démarrage avec matricule EMP${String(employeeIndex).padStart(4, '0')}`);

    let created = 0;
    const assignedUserIds = new Set<string>(); // Tracker les userIds déjà assignés dans cette génération

    for (let i = 0; i < count; i++) {
      const firstName = this.generateFirstName();
      const lastName = this.generateLastName();
      const matricule = `EMP${String(employeeIndex).padStart(4, '0')}`;
      const email = config.dataOptions?.generateEmails !== false
        ? `${matricule.toLowerCase()}@company.local`
        : `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 0 ? i : ''}@company.local`;

      // Assigner aux structures selon la distribution ou aléatoirement
      const siteId = assignToStructures && sites.length > 0
        ? this.selectRandom(sites).id
        : undefined;
      const departmentId = assignToStructures && departments.length > 0
        ? this.selectRandom(departments).id
        : undefined;
      const positionId = assignToStructures && positions.length > 0
        ? this.selectRandom(positions).id
        : undefined;
      const teamId = assignToStructures && teams.length > 0
        ? this.selectRandom(teams).id
        : undefined;

      // Lier à un utilisateur si demandé
      let userId: string | undefined;
      if (linkToUsers && users.length > 0) {
        // Filtrer les utilisateurs qui n'ont pas d'employé ET qui n'ont pas été assignés dans cette génération
        const availableUsers = users.filter((u) => !u.employee && !assignedUserIds.has(u.id));
        if (availableUsers.length > 0) {
          const selectedUser = this.selectRandom(availableUsers);
          userId = selectedUser.id;
          assignedUserIds.add(userId); // Marquer comme assigné
        }
      }

      // Générer des données optionnelles
      const phone = config.dataOptions?.generatePhones !== false
        ? this.generatePhone()
        : undefined;
      const address = config.dataOptions?.generateAddresses !== false
        ? this.generateAddress()
        : undefined;
      const hireDate = this.generateHireDate();

      // Créer l'employé (pas besoin de vérifier l'existence car on utilise un index séquentiel)
      await this.prisma.employee.create({
        data: {
          tenantId,
          matricule,
          firstName,
          lastName,
          email,
          phone,
          address,
          hireDate,
          siteId,
          departmentId,
          positionId,
          teamId,
          userId,
          isActive: true,
          position: positions.find((p) => p.id === positionId)?.name || undefined, // Legacy field
        },
      });

      created++;
      employeeIndex++;
      this.orchestrator.incrementEntityCount('Employee');
    }

    this.logger.log(`✅ ${created} employés créés`);
    return created;
  }

  /**
   * Sélectionne un élément aléatoire d'un tableau
   */
  private selectRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Génère un prénom réaliste
   */
  private generateFirstName(): string {
    const firstNames = [
      'Ahmed', 'Mohamed', 'Fatima', 'Aicha', 'Hassan', 'Said', 'Khadija', 'Laila',
      'Youssef', 'Omar', 'Zineb', 'Nadia', 'Karim', 'Samir', 'Salma', 'Sanae',
      'Mehdi', 'Bilal', 'Imane', 'Souad', 'Rachid', 'Nabil', 'Najat', 'Latifa',
      'Jean', 'Pierre', 'Marie', 'Sophie', 'Paul', 'Luc', 'Julie', 'Anne',
    ];
    return firstNames[Math.floor(Math.random() * firstNames.length)];
  }

  /**
   * Génère un nom de famille réaliste
   */
  private generateLastName(): string {
    const lastNames = [
      'Alaoui', 'Benali', 'Cherkaoui', 'El Amrani', 'Fassi', 'Idrissi', 'Lamrani', 'Mansouri',
      'Naciri', 'Ouali', 'Rahmani', 'Saadi', 'Tazi', 'Zahiri', 'Bennani', 'Chraibi',
      'Dupont', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit',
    ];
    return lastNames[Math.floor(Math.random() * lastNames.length)];
  }

  /**
   * Génère un numéro de téléphone marocain réaliste
   */
  private generatePhone(): string {
    const prefixes = ['06', '07'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = String(Math.floor(Math.random() * 90000000) + 10000000);
    return `${prefix}${number}`;
  }

  /**
   * Génère une adresse réaliste
   */
  private generateAddress(): string {
    const streets = [
      'Rue Mohammed V',
      'Avenue Hassan II',
      'Boulevard Zerktouni',
      'Rue Allal Ben Abdellah',
      'Avenue des FAR',
      'Rue de la Résistance',
      'Boulevard Mohammed VI',
    ];
    const numbers = Math.floor(Math.random() * 200) + 1;
    return `${numbers} ${streets[Math.floor(Math.random() * streets.length)]}`;
  }

  /**
   * Génère une date d'embauche réaliste (dans les 5 dernières années)
   */
  private generateHireDate(): Date {
    const now = new Date();
    const fiveYearsAgo = new Date(now.getFullYear() - 5, 0, 1);
    const randomTime = fiveYearsAgo.getTime() + Math.random() * (now.getTime() - fiveYearsAgo.getTime());
    return new Date(randomTime);
  }
}

