"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteManagersModule = void 0;
const common_1 = require("@nestjs/common");
const site_managers_service_1 = require("./site-managers.service");
const site_managers_controller_1 = require("./site-managers.controller");
const prisma_module_1 = require("../../database/prisma.module");
let SiteManagersModule = class SiteManagersModule {
};
exports.SiteManagersModule = SiteManagersModule;
exports.SiteManagersModule = SiteManagersModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [site_managers_controller_1.SiteManagersController],
        providers: [site_managers_service_1.SiteManagersService],
        exports: [site_managers_service_1.SiteManagersService],
    })
], SiteManagersModule);
//# sourceMappingURL=site-managers.module.js.map