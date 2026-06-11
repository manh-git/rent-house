import { AddressDto, PostDto, RoomFeaturesDto } from "./createRooms.dto.js";

export class UpdateRoomDto {
  original_price?: number;
  discount_price?: number;
  forecast_price?: number;
  room_id!: number;
  post_id!: number;
  address?: AddressDto;
  features?: RoomFeaturesDto;
  post?: PostDto; 
}