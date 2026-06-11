import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateUserDto{
    @IsString()
    full_name?: string;

    @IsString()
    phone?: string;
    
    @IsString()
    avatar_url?: string;

    @IsNumber()
    @IsOptional()
    role_id?: number;
}