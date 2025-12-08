import { CreateLeaveDto } from './create-leave.dto';
declare const UpdateLeaveDto_base: import("@nestjs/common").Type<Partial<Omit<CreateLeaveDto, "employeeId">>>;
export declare class UpdateLeaveDto extends UpdateLeaveDto_base {
}
export {};
