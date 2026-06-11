import { IsString, IsOptional,IsNumber } from "class-validator";

export class GetListRoommate {
    @IsOptional()
    preferred_gender?: string;

    @IsOptional()
    title?: string;

    @IsOptional()
    min_age?: number;

    @IsOptional()
    max_age?: number;

    @IsOptional()
    budget?: number;

    @IsOptional()
    habits?: string;

    @IsOptional()
    ward_id?: number;

    @IsNumber()
    index!: number;

    @IsNumber()
    count!: number;
}