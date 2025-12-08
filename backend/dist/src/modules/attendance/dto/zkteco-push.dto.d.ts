export declare class ZKTecoPushDataDto {
    pin: string;
    time: string;
    status: string;
    verify: string;
}
export declare class ZKTecoPushDto {
    sn: string;
    table: string;
    stamp?: string;
    data: ZKTecoPushDataDto;
}
