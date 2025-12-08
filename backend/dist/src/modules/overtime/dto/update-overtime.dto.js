"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateOvertimeDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_overtime_dto_1 = require("./create-overtime.dto");
class UpdateOvertimeDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_overtime_dto_1.CreateOvertimeDto, ['employeeId'])) {
}
exports.UpdateOvertimeDto = UpdateOvertimeDto;
//# sourceMappingURL=update-overtime.dto.js.map