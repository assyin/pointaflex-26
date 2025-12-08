"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateLeaveTypeDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_leave_type_dto_1 = require("./create-leave-type.dto");
class UpdateLeaveTypeDto extends (0, swagger_1.PartialType)(create_leave_type_dto_1.CreateLeaveTypeDto) {
}
exports.UpdateLeaveTypeDto = UpdateLeaveTypeDto;
//# sourceMappingURL=update-leave-type.dto.js.map