import { IsInt, IsNotEmpty, IsObject, IsOptional, IsNumber } from 'class-validator';

export class CreateContractDto {
  @IsInt()
  tenant_id: number;

  @IsInt()
  room_id: number;

  @IsNotEmpty()
  start_date: Date;

  @IsNumber()
  deposit_amount: number;

  @IsNumber()
  monthly_rent: number;
}

export class UpdateContractDraftDto {
  @IsObject()
  @IsOptional()
  draft_data?: any; // Lưu các điều khoản, thông tin cá nhân
}