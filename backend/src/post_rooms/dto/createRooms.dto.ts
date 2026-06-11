import { IsNumber, IsNotEmpty, IsOptional, IsString, isNumber, IsBoolean, IsArray, Validate, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class MediaRoomDto{
    @IsString()
    file_url?: string;

    @IsString()
    file_type?: string;
}

export class AddressDto{
    @IsString()
    @IsNotEmpty()
    ward_name!: string;

    @IsString()
    @IsNotEmpty()
    detail!: string;

    @IsNumber()
    @IsNotEmpty()
    lat!: number;

    @IsNumber()
    @IsNotEmpty()
    lng!: number;
}

export class PostDto{
    @IsString()
    title!: string;

    @IsString()
    content!: string;

    @IsString()
    post_type?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(()=> MediaRoomDto)
    media?: MediaRoomDto[];
}
export class RoomFeaturesDto{
    @IsNumber()
    area_size!: number;

    @IsBoolean()
    has_wifi!: boolean;

    @IsBoolean()
    has_air_con!:  boolean;

    @IsBoolean()
    has_parking!:  boolean;

    @IsNumber()
    neighborhood_safety_score!: number;

    @IsNumber()
    bedrooms!: number;
    
    @IsNumber()
    bathrooms!: number;

    @IsBoolean()
    furnished!:  boolean;

    @IsNumber()
    floors!: number;

    @IsBoolean()
    has_balcony!:  boolean;

}
export class CreateRoomDto{
    @IsNotEmpty()
    @IsNumber()
    original_price!: number;

    @IsNumber()
    discount_price?: number;

    @IsNumber()
    forecast_price?: number;

    @ValidateNested()
    @Type(()=> RoomFeaturesDto)
    features!: RoomFeaturesDto;


    @ValidateNested()
    @Type(()=> PostDto)
    post!: PostDto;

    @ValidateNested()
    @Type(()=>AddressDto)
    address?: AddressDto;

}