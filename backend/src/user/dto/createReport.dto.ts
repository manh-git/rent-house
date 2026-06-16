import { IsArray, IsNumber, IsOptional, IsString, IsUrl } from "class-validator";
export class createReportDto{
    @IsString()
    target_type!: string;
    
    @IsNumber()
    target_id?: number;
    
    @IsString()
    reason!: string;

    
}