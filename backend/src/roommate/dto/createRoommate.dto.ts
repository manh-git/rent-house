import { Type } from 'class-transformer'; 
import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateRoommate {
    @IsString() @IsOptional() preferred_gender!: string;

    @IsNumber() @IsOptional() @Type(() => Number) min_age!: number;
    @IsNumber() @IsOptional() @Type(() => Number) max_age!: number;
    @IsNumber() @IsOptional() @Type(() => Number) budget!: number;
    @IsNumber() @IsOptional() @Type(() => Number) room_id!: number;
    @IsNumber() @IsOptional() @Type(() => Number) ward_id!: number;

    @IsString() title!: string;
    @IsString() @IsOptional() habits!: string;
}