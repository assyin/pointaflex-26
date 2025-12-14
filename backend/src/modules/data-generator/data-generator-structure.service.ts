import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { StructureConfigDto } from './dto/generate-all-data.dto';

@Injectable()
export class DataGeneratorStructureService {
  private readonly logger = new Logger(DataGeneratorStructureService.name);

  // Données prédéfinies réalistes
  private readonly defaultSites = [
    { name: 'Siège Social', code: 'HQ', city: 'Casablanca' },
    { name: 'Agence Rabat', code: 'RBT', city: 'Rabat' },
    { name: 'Agence Marrakech', code: 'MRK', city: 'Marrakech' },
    { name: 'Agence Tanger', code: 'TNG', city: 'Tanger' },
    { name: 'Agence Fès', code: 'FES', city: 'Fès' },
  ];

  private readonly defaultDepartments = [
    { name: 'Ressources Humaines', code: 'RH', description: 'Gestion du personnel' },
    { name: 'Technologies de l\'Information', code: 'IT', description: 'Informatique et systèmes' },
    { name: 'Production', code: 'PROD', description: 'Production et opérations' },
    { name: 'Commercial', code: 'COM', description: 'Ventes et marketing' },
    { name: 'Finance', code: 'FIN', description: 'Comptabilité et finances' },
    { name: 'Qualité', code: 'QUAL', description: 'Contrôle qualité' },
    { name: 'Logistique', code: 'LOG', description: 'Transport et stockage' },
    { name: 'Maintenance', code: 'MAINT', description: 'Maintenance technique' },
  ];

  private readonly defaultPositions = [
    { name: 'Directeur Général', category: 'Direction', code: 'DG' },
    { name: 'Directeur RH', category: 'Direction', code: 'DRH' },
    { name: 'Directeur IT', category: 'Direction', code: 'DIT' },
    { name: 'Manager RH', category: 'Management', code: 'MRH' },
    { name: 'Manager Production', category: 'Management', code: 'MPROD' },
    { name: 'Chef de Projet', category: 'Management', code: 'CP' },
    { name: 'Développeur Senior', category: 'Technique', code: 'DEV-S' },
    { name: 'Développeur', category: 'Technique', code: 'DEV' },
    { name: 'Analyste', category: 'Technique', code: 'ANA' },
    { name: 'Comptable', category: 'Administratif', code: 'COMP' },
    { name: 'Assistant RH', category: 'Administratif', code: 'ARH' },
    { name: 'Ouvrier', category: 'Production', code: 'OUV' },
    { name: 'Technicien', category: 'Technique', code: 'TECH' },
    { name: 'Commercial', category: 'Commercial', code: 'COM' },
    { name: 'Responsable Qualité', category: 'Qualité', code: 'RQ' },
  ];

  private readonly defaultTeams = [
    { name: 'Équipe Alpha', code: 'TEAM-A', description: 'Équipe de production principale' },
    { name: 'Équipe Beta', code: 'TEAM-B', description: 'Équipe de production secondaire' },
    { name: 'Équipe Gamma', code: 'TEAM-C', description: 'Équipe de maintenance' },
    { name: 'Équipe Delta', code: 'TEAM-D', description: 'Équipe de qualité' },
  ];

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DataGeneratorOrchestratorService))
    private readonly orchestrator: DataGeneratorOrchestratorService,
  ) {}

  /**
   * Génère les sites
   */
  async generateSites(tenantId: string, config: StructureConfigDto): Promise<number> {
    this.logger.log(`📍 Génération des sites pour tenant ${tenantId}`);

    let sitesToCreate = config.sites || [];
    const sitesCount = config.sitesCount || 0;

    // Si pas de sites personnalisés, utiliser les sites par défaut
    if (sitesToCreate.length === 0 && sitesCount > 0) {
      sitesToCreate = this.defaultSites.slice(0, sitesCount).map((site) => ({
        name: site.name,
        code: site.code,
        address: undefined,
        city: site.city,
        latitude: undefined,
        longitude: undefined,
      }));
    }

    let created = 0;
    for (const siteData of sitesToCreate) {
      // Vérifier si le site existe déjà
      const existing = await this.prisma.site.findFirst({
        where: {
          tenantId,
          name: siteData.name,
        },
      });

      if (!existing) {
        await this.prisma.site.create({
          data: {
            tenantId,
            name: siteData.name,
            code: siteData.code || undefined,
            address: siteData.address || undefined,
            city: siteData.city || undefined,
            latitude: siteData.latitude ? String(siteData.latitude) : undefined,
            longitude: siteData.longitude ? String(siteData.longitude) : undefined,
          },
        });
        created++;
        this.orchestrator.incrementEntityCount('Site');
      }
    }

    this.logger.log(`✅ ${created} sites créés`);
    return created;
  }

  /**
   * Génère les départements
   */
  async generateDepartments(tenantId: string, config: StructureConfigDto): Promise<number> {
    this.logger.log(`📁 Génération des départements pour tenant ${tenantId}`);

    let departmentsToCreate = config.departments || [];
    const departmentsCount = config.departmentsCount || 0;

    // Si pas de départements personnalisés, utiliser les départements par défaut
    if (departmentsToCreate.length === 0 && departmentsCount > 0) {
      departmentsToCreate = this.defaultDepartments.slice(0, departmentsCount).map((dept) => ({
        name: dept.name,
        code: dept.code,
        description: dept.description,
      }));
    }

    let created = 0;
    for (const deptData of departmentsToCreate) {
      // Vérifier si le département existe déjà
      const existing = await this.prisma.department.findFirst({
        where: {
          tenantId,
          name: deptData.name,
        },
      });

      if (!existing) {
        await this.prisma.department.create({
          data: {
            tenantId,
            name: deptData.name,
            code: deptData.code || undefined,
            description: deptData.description || undefined,
          },
        });
        created++;
        this.orchestrator.incrementEntityCount('Department');
      }
    }

    this.logger.log(`✅ ${created} départements créés`);
    return created;
  }

  /**
   * Génère les positions
   */
  async generatePositions(tenantId: string, config: StructureConfigDto): Promise<number> {
    this.logger.log(`💼 Génération des positions pour tenant ${tenantId}`);

    let positionsToCreate = config.positions || [];
    const positionsCount = config.positionsCount || 0;

    // Si pas de positions personnalisées, utiliser les positions par défaut
    if (positionsToCreate.length === 0 && positionsCount > 0) {
      positionsToCreate = this.defaultPositions.slice(0, positionsCount).map((pos) => ({
        name: pos.name,
        code: pos.code,
        category: pos.category,
        description: undefined,
      }));
    }

    let created = 0;
    for (const posData of positionsToCreate) {
      // Vérifier si la position existe déjà
      const existing = await this.prisma.position.findFirst({
        where: {
          tenantId,
          name: posData.name,
        },
      });

      if (!existing) {
        await this.prisma.position.create({
          data: {
            tenantId,
            name: posData.name,
            code: posData.code || undefined,
            category: posData.category || undefined,
            description: posData.description || undefined,
          },
        });
        created++;
        this.orchestrator.incrementEntityCount('Position');
      }
    }

    this.logger.log(`✅ ${created} positions créées`);
    return created;
  }

  /**
   * Génère les équipes
   */
  async generateTeams(tenantId: string, config: StructureConfigDto): Promise<number> {
    this.logger.log(`👥 Génération des équipes pour tenant ${tenantId}`);

    let teamsToCreate = config.teams || [];
    const teamsCount = config.teamsCount || 0;

    // Si pas d'équipes personnalisées, utiliser les équipes par défaut
    if (teamsToCreate.length === 0 && teamsCount > 0) {
      teamsToCreate = this.defaultTeams.slice(0, teamsCount).map((team) => ({
        name: team.name,
        code: team.code,
        description: team.description,
      }));
    }

    let created = 0;
    for (const teamData of teamsToCreate) {
      // Vérifier si l'équipe existe déjà
      const existing = await this.prisma.team.findFirst({
        where: {
          tenantId,
          name: teamData.name,
        },
      });

      if (!existing) {
        await this.prisma.team.create({
          data: {
            tenantId,
            name: teamData.name,
            code: teamData.code || undefined,
            description: teamData.description || undefined,
          },
        });
        created++;
        this.orchestrator.incrementEntityCount('Team');
      }
    }

    this.logger.log(`✅ ${created} équipes créées`);
    return created;
  }

  /**
   * Génère toute la structure organisationnelle
   */
  async generateStructure(tenantId: string, config: StructureConfigDto): Promise<{
    sites: number;
    departments: number;
    positions: number;
    teams: number;
  }> {
    this.logger.log(`🏢 Génération de la structure organisationnelle pour tenant ${tenantId}`);

    const sites = await this.generateSites(tenantId, config);
    const departments = await this.generateDepartments(tenantId, config);
    const positions = await this.generatePositions(tenantId, config);
    const teams = await this.generateTeams(tenantId, config);

    this.logger.log(
      `✅ Structure créée: ${sites} sites, ${departments} départements, ${positions} positions, ${teams} équipes`,
    );

    return { sites, departments, positions, teams };
  }
}

