import { PrismaClient, Prisma } from "@prisma/client";
import { CreateRoomDto } from "../dto/createRooms.dto.js";

const prisma = new PrismaClient();

export const createPostRoom = async(userId: number, dto: CreateRoomDto )=>{
    const user = await prisma.users.findUnique({ where: {user_id: userId}});
    if(!user) throw new Error('Người dùng không tồn tại!');
    try{
    const {
        original_price,
        discount_price,
        forecast_price,
        address,
        post,
        features
    } = dto;
    const sourceFeatures = features ? dto.features : dto;
    const preparedFeatures = {
    area_size: sourceFeatures?.area_size ? Number(sourceFeatures.area_size) : 0,
    neighborhood_safety_score: sourceFeatures?.neighborhood_safety_score ? Number(sourceFeatures.neighborhood_safety_score) : 5,
    floors: sourceFeatures?.floors ? Number(sourceFeatures.floors) : 1,
    bedrooms: sourceFeatures?.bedrooms ? Number(sourceFeatures.bedrooms) : 0,
    bathrooms: sourceFeatures?.bathrooms ? Number(sourceFeatures.bathrooms) : 0,
    
    has_wifi: sourceFeatures?.has_wifi === true || sourceFeatures?.has_wifi === 'true' || Number(sourceFeatures?.has_wifi) === 1,
    has_air_con: sourceFeatures?.has_air_con === true || sourceFeatures?.has_air_con === 'true' || Number(sourceFeatures?.has_air_con) === 1,
    has_parking: sourceFeatures?.has_parking === true || sourceFeatures?.has_parking === 'true' || Number(sourceFeatures?.has_parking) === 1,
    furnished: sourceFeatures?.furnished === true || sourceFeatures?.furnished === 'true' || Number(sourceFeatures?.furnished) === 1,
    has_balcony: sourceFeatures?.has_balcony === true || sourceFeatures?.has_balcony === 'true' || Number(sourceFeatures?.has_balcony) === 1,
};
    let wardId: number | null = null;
        if (address?.ward_name) {
            const ward = await prisma.wards.findFirst({
                where: { ward_name: address.ward_name }
            });
            if (!ward) throw new Error(`Phường/Xã "${address.ward_name}" không tồn tại trong hệ thống!`);
            wardId = ward.ward_id;
        }
return await prisma.$transaction(async (tx) => {
    const latValue = Number(address?.lat);
    const lngValue = Number(address?.lng);

    if (!wardId) {
        throw new Error("Không thể tạo địa chỉ vì không tìm thấy mã Phường/Xã (wardId)!");
    }
    if (isNaN(latValue) || isNaN(lngValue)) {
        throw new Error("Tọa độ kinh độ hoặc vĩ độ truyền lên bị lỗi định dạng số (NaN)!");
    }

    const newAddress = await tx.addresses.create({
        data: {
            ward_id: wardId, 
            detail: address?.detail ?? "",
            lat: latValue,
            lng: lngValue,
        }
    });

        const newRoom = await tx.rooms.create({
            data: {
                owner_id: userId,
                address_id: newAddress.address_id,
                original_price: Number(original_price),
                discount_price: Number(discount_price),
                forecast_price: forecast_price ? Number(forecast_price) : null ,
            }
        })
        await tx.roomFeatures.create({
            data: {
                room_id: newRoom.room_id,
                ...preparedFeatures
            }
        })
        const newPost = await tx.posts.create({
            data: {
                room_id: newRoom.room_id,
                title: post.title,
                content: post.content,
                post_type: post.post_type || null,
            }
        })
        let createdMedia: any[]=[];
        const clientImages = (dto as any).image_urls;
        if (clientImages) {
    const finalImages = Array.isArray(clientImages) ? clientImages : [clientImages];

    const mediaData = finalImages.map((url: string) => ({
                post_id: newPost.post_id, 
                file_url: url,            
                file_type: 'image'        
            }));

            await tx.media.createMany({
                data: mediaData
            });

            createdMedia = mediaData;
}

        return { code: 1000,
            message: 'Tạo phòng thành công',
            data: {
                room: newRoom,
                post: {
                    ...newPost,
                    media: createdMedia
                }
            }
        }
    })
    }
    catch(e){
        console.log(e);
    }

}

export const updatePostRoom = async (userId: number, dto: any) => {
    const user = await prisma.users.findUnique({ where: { user_id: userId } });
    if (!user) throw new Error('Người dùng không tồn tại!');

    try {
        // 1. Lấy các ID cốt lõi
        const room_id = dto.room_id;
        const post_id = dto.post_id;
        const original_price = dto.original_price;
        const discount_price = dto.discount_price;
        const forecast_price = dto.forecast_price;

        if (!room_id || !post_id) {
            throw new Error("Thiếu room_id hoặc post_id bắt buộc!");
        }

        // 2. Tự động gom dữ liệu phẳng từ React Native vào đúng Object Address
        const address = {
            ward_name: dto.ward_name,
            detail: dto.address_detail || dto.detail || "",
            lat: dto.lat,
            lng: dto.lng
        };

        // 3. Tự động gom dữ liệu phẳng từ React Native vào đúng Object Post
        const post = {
            title: dto.title,
            content: dto.content,
            post_type: dto.post_type,
            media: dto.image_urls ? (Array.isArray(dto.image_urls) ? dto.image_urls.map((url: string) => ({ file_url: url, file_type: 'image' })) : []) : undefined
        };

        // 4. Chuẩn hóa dữ liệu Features từ các trường phẳng gửi lên
        const preparedFeatures: any = {};
        
        if (dto.area_size !== undefined) preparedFeatures.area_size = Number(dto.area_size);
        if (dto.neighborhood_safety_score !== undefined) preparedFeatures.neighborhood_safety_score = Number(dto.neighborhood_safety_score);
        if (dto.floors !== undefined) preparedFeatures.floors = Number(dto.floors);
        if (dto.bedrooms !== undefined) preparedFeatures.bedrooms = Number(dto.bedrooms);
        if (dto.bathrooms !== undefined) preparedFeatures.bathrooms = Number(dto.bathrooms);

        // Ép kiểu Boolean cho các trường True/False (Chấp nhận cả chuỗi 'true' từ FormData)
        if (dto.has_wifi !== undefined) preparedFeatures.has_wifi = dto.has_wifi === true || dto.has_wifi === 'true' || Number(dto.has_wifi) === 1;
        if (dto.has_air_con !== undefined) preparedFeatures.has_air_con = dto.has_air_con === true || dto.has_air_con === 'true' || Number(dto.has_air_con) === 1;
        if (dto.has_parking !== undefined) preparedFeatures.has_parking = dto.has_parking === true || dto.has_parking === 'true' || Number(dto.has_parking) === 1;
        if (dto.furnished !== undefined) preparedFeatures.furnished = dto.furnished === true || dto.furnished === 'true' || Number(dto.furnished) === 1;
        if (dto.has_balcony !== undefined) preparedFeatures.has_balcony = dto.has_balcony === true || dto.has_balcony === 'true' || Number(dto.has_balcony) === 1;


        // 5. Kiểm tra phòng có tồn tại và thuộc quyền sở hữu của User không
        const room = await prisma.rooms.findUnique({
            where: { room_id: Number(room_id) },
            select: {
                owner_id: true,
                address_id: true,
            }
        });
        if (!room) throw new Error('Căn phòng không tồn tại!');
        if (userId !== room.owner_id) throw new Error('Bạn không có quyền sửa bài viết này!');

        // 6. Xử lý tìm Ward ID
        let wardId: number | null = null;
        if (address.ward_name) {
            const ward = await prisma.wards.findFirst({
                where: { ward_name: address.ward_name }
            });
            if (!ward) throw new Error(`Phường/Xã "${address.ward_name}" không tồn tại trong hệ thống!`);
            wardId = ward.ward_id;
        }

        // 7. Chạy Transaction cập nhật dữ liệu vào DB
        return await prisma.$transaction(async (tx) => {
            
            // Cập nhật bảng Rooms
            const updatedRoom = await tx.rooms.update({
                where: { room_id: Number(room_id) },
                data: {
                    original_price: original_price ? Number(original_price) : undefined,
                    discount_price: discount_price ? Number(discount_price) : undefined,
                    forecast_price: forecast_price ? Number(forecast_price) : null,
                }
            });

            // Cập nhật bảng Địa chỉ
            if (address.lat && address.lng) {
                const latValue = Number(address.lat);
                const lngValue = Number(address.lng);

                if (isNaN(latValue) || isNaN(lngValue)) {
                    throw new Error("Tọa độ vĩ độ/kinh độ gửi lên bị sai định dạng số!");
                }

                await tx.addresses.update({
                    where: { address_id: room.address_id },
                    data: {
                        ward_id: wardId || undefined,
                        detail: address.detail,
                        lat: latValue,
                        lng: lngValue
                    }
                });
            }

            // Cập nhật bảng Tiện ích
            if (Object.keys(preparedFeatures).length > 0) {
                const exist = await tx.roomFeatures.findFirst({
                    where: { room_id: Number(room_id) }
                });

                if (exist) {
                    await tx.roomFeatures.update({
                        where: { feature_id: exist.feature_id },
                        data: preparedFeatures
                    });
                } else {
                    await tx.roomFeatures.create({
                        data: {
                            room_id: Number(room_id),
                            ...preparedFeatures
                        }
                    });
                }
            }

            // Cập nhật bài Post
            let updatedPost = null;
            if (post.title || post.content) {
                updatedPost = await tx.posts.update({
                    where: { 
                        post_id: Number(post_id),
                        room_id: Number(room_id)
                    },
                    data: {
                        title: post.title ? String(post.title) : undefined,
                        content: post.content ? String(post.content) : undefined,
                        post_type: post.post_type ? String(post.post_type) : null
                    }
                });
            }

            // Cập nhật danh sách Media ảnh (image_urls)
            if (dto.image_urls) {
                await tx.media.deleteMany({
                    where: { post_id: Number(post_id) }
                });

                if (post.media && post.media.length > 0) {
                    await tx.media.createMany({
                        data: post.media.map((m: any) => ({
                            post_id: Number(post_id),
                            file_url: m.file_url,
                            file_type: 'image'
                        }))
                    });
                }
            }

            return {
                code: 1000,
                message: 'Cập nhật phòng thành công!',
                data: {
                    room: updatedRoom,
                    post: updatedPost
                }
            };
        });

    } catch (error: any) {
        console.error(" Lỗi tại updatePostRoom:", error);
        throw new Error(error.message || "Cập nhật phòng thất bại!");
    }
};

export const deletePostRoom = async(userId: number, room_id: number)=>{
    const user = await prisma.users.findUnique({ where: {user_id: userId}});
    if(!user) throw new Error('Người dùng không tồn tại!');
    const room = await prisma.rooms.findUnique({
        where: {room_id: Number(room_id)},
        select: {
            owner_id: true,
            posts: true,
            address_id: true,
        }
    })
    if(!room) throw new Error('Căn phòng không tồn tại!');
    if(userId  !== room.owner_id) throw new Error ('Bạn không có quyền sửa bài viêt!');

    return await prisma.$transaction(async (tx) => {

        const posts = await tx.posts.findMany({
            where: { room_id: Number(room_id) },
            select: { post_id: true }
        });

        const postIds = posts.map(p => p.post_id);

        if (postIds.length > 0) {
            await tx.media.deleteMany({
                where: {
                    post_id: { in: postIds }
                }
            });
        }

        await tx.posts.deleteMany({
            where: { room_id: Number(room_id) }
        });

        await tx.roomFeatures.deleteMany({
            where: { room_id: Number(room_id) }
        });

        await tx.rooms.delete({
            where: { room_id: Number(room_id) }
        });

        await tx.addresses.delete({
            where: { address_id: room.address_id }
        });

        return {
            code: 1000,
            message: 'Xoá phòng thành công'
        };
    });

}
export const getListPost = async (dto: any) => {
    const index = dto.index ? Number(dto.index) : 0;
    const count = dto.count ? Number(dto.count) : 10;
    
    const price_min = dto.price_min !== undefined ? Number(dto.price_min) : (dto.minPrice !== undefined ? Number(dto.minPrice) : undefined);
    const price_max = dto.price_max !== undefined ? Number(dto.price_max) : (dto.maxPrice !== undefined ? Number(dto.maxPrice) : undefined);
    const area_min = dto.area_min !== undefined ? Number(dto.area_min) : (dto.minArea !== undefined ? Number(dto.minArea) : undefined);
    const area_max = dto.area_max !== undefined ? Number(dto.area_max) : (dto.maxArea !== undefined ? Number(dto.maxArea) : undefined);

    const ward_id = dto.ward_id ? Number(dto.ward_id) : undefined;
    const type = dto.type;
    const searchText = dto.search || dto.searchText || dto.key;

    //  1. KHỞI TẠO ĐIỀU KIỆN BAN ĐẦU CHUẨN
    const where: any = {};
    const roomConditions: any = {}; // Tạo một object gom tất cả bộ lọc liên quan đến Room

    if (searchText) {
        where.OR = [
            { title: { contains: searchText, mode: 'insensitive' } },
            { content: { contains: searchText, mode: 'insensitive' } }
        ];
    }

    //  2. BỘ LỌC GIÁ (Gom vào roomConditions phẳng)
    if (price_min !== undefined || price_max !== undefined) {
        roomConditions.original_price = {};
        if (price_min !== undefined) roomConditions.original_price.gte = price_min;
        if (price_max !== undefined) roomConditions.original_price.lte = price_max;
    }

    //  3. BỘ LỌC KHU VỰC (Gom vào roomConditions)
    if (ward_id) {
        roomConditions.address = {
            ward_id: ward_id
        };
    }

    if (type) {
        where.post_type = type;
    }

    //  4. BỘ LỌC CHI TIẾT TIỆN ÍCH & DIỆN TÍCH
    const featureConditions: any = {};

    if (area_min !== undefined || area_max !== undefined) {
        const areaQuery: any = {};
        if (area_min !== undefined) {
            areaQuery.gte = new Prisma.Decimal(area_min);
        }
        if (area_max !== undefined) {
            areaQuery.lte = new Prisma.Decimal(area_max);
        }
        featureConditions.area_size = areaQuery;
    }

    if (dto.bedrooms) featureConditions.bedrooms = { gte: Number(dto.bedrooms) };
    if (dto.bathrooms) featureConditions.bathrooms = { gte: Number(dto.bathrooms) };

    const booleanFeatures = ['has_wifi', 'has_air_con', 'has_parking', 'furnished', 'has_balcony'];
    booleanFeatures.forEach(field => {
        const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const clientValue = dto[field] !== undefined ? dto[field] : dto[camelField];

        if (clientValue === true || clientValue === 'true' || Number(clientValue) === 1) {
            featureConditions[field] = true;
        }
    });

    if (Object.keys(featureConditions).length > 0) {
        roomConditions.features = featureConditions; 
    }

    //  5. ĐÂY LÀ ĐOẠN KHẮC PHỤC CHÍNH: Bọc toàn bộ điều kiện room qua từ khóa 'is'
    if (Object.keys(roomConditions).length > 0) {
        where.room = {
            is: roomConditions // Ép cấu trúc Object Relation chuẩn chỉnh của Prisma
        };
    }

    // ── TIẾN HÀNH QUERY DB ──
    try{
    const posts = await prisma.posts.findMany({
        where,
        skip: index,
        take: count,
        orderBy: {
            created_at: 'desc'
        },
        select: {
            post_id: true,
            title: true,
            content: true,
            created_at: true,
            media: {
                select: {
                    media_id: true,
                    file_url: true,
                    file_type: true,
                }
            },
            room: {
                select: {
                    is_rented: true,
                    room_id: true,
                    original_price: true,
                    discount_price: true,
                    address: {
                        select: {
                            detail: true,
                            lat: true,
                            lng: true,
                            ward: {
                                select: {
                                    ward_name: true,
                                }
                            }
                        }
                    },
                    features: true,
                    owner: {
                        select: {
                            user_id: true,
                            full_name: true,
                            avatar_url: true,
                        }
                    }, 
                }
            }
        }
    });

    return {
        code: 1000,
        data: posts
    };
    }catch(e){
        console.log(e);
    }
};
export const getPost = async(post_id: number)=>{
    const post = await prisma.posts.findUnique({
        where: {post_id: post_id},
        include: {
            room: {
                include:{
                    address: {include:{
                        ward: true,
                    }},
                    features: true,
                    owner: {
                        select: {
                            user_id: true,
                            full_name: true,
                            avatar_url: true,
                        }
                    },
                }
            },
            media: true,
        }
         
    })
    return {
        code: 1000,
        message: 'Lấy thông tin về phòng thành công!',
        data: post,
    }
}

// get list post_owner
export const getListPostOwner = async ( targetUserId: number) => {
    const ownerId = targetUserId ;

    const user = await prisma.users.findUnique({ where: { user_id: Number(ownerId) } });
    if (!user) throw new Error('Người dùng không tồn tại!');

    const posts = await prisma.posts.findMany({
        where: {
            room: {
                owner_id: ownerId
            }
        },
        include: {
            media: true, // Lấy ảnh
            room: {
                include: {
                    address: {
                        include: { ward: true }
                    },
                    features: true,
                    owner: {
                        select: {
                            user_id: true,
                            full_name: true,
                            avatar_url: true,
                            role_id: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            created_at: 'desc'
        }
    });

    return {
        code: 1000,
        message: 'Lấy danh sách bài đăng của chủ nhà thành công!',
        data: posts 
    };
};
export const getWard = async()=>{
    const ward = await prisma.wards.findMany();
    return {
        code: 1000,
        message: 'Lấy danh sách phường thành công',
        data: ward
    }
}