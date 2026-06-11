import { Type } from "class-transformer";
import { IsString, IsNumber, IsNotEmpty, IsOptional, IsArray, ValidateNested } from "class-validator";


export class CreateMediaDto {
  @IsString()
  file_url!: string;

  @IsString()
  file_type!: string; 
}

export class SaveMessDto{
    @IsNumber()
    @IsNotEmpty()
    conv_id!: number;


    @IsNumber()
    sender_id!: number;

    @IsOptional()
    @IsString()
    message_test?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({each: true})
    @Type(()=>CreateMediaDto)
    media?: CreateMediaDto[];


}