import { IsNumber, IsNotEmpty, isNumber } from "class-validator";

export class GetListPostDto{
    @IsNumber()
    @IsNotEmpty()
    index!: number;

    @IsNotEmpty()
    @IsNumber()
    count!: number;

    @IsNumber()
    price_max!: number;

    @IsNumber()
    price_min!: number;

    @IsNumber()
    ward_id!: number;

    @IsNumber()
    type!: number;

    @IsNumber()
    area_min!: number;

    @IsNumber()
    area_max!: number;

    @IsNumber()
    bedrooms!: number;

    @IsNumber()
    bathrooms!: number;
}