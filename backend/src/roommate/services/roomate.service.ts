import { PrismaClient, Prisma } from "@prisma/client";
import { CreateRoommate } from "../dto/createRoommate.dto.js";
import { UpdateRoommate } from "../dto/updateRoommate.dto.js";
import { GetListRoommate } from "../dto/getListRoommate.dto.js";

const prisma = new PrismaClient();

export const createRoommate = async (dto: CreateRoommate, userId: number) => {
  const user = await prisma.users.findUnique({ where: { user_id: Number(userId) } });
  if (!user) throw new Error('Người dùng không tồn tại!');

  const { preferred_gender, min_age, max_age, budget, habits, room_id, ward_id, title } = dto;

  if (room_id) {
    const room = await prisma.rooms.findUnique({ where: { room_id: Number(room_id) } });
    if (!room) throw new Error('Phòng này không tồn tại!');
  }

  const data = await prisma.roommateRequests.create({
    data: {
      sender_id: userId,
      title: title,
      preferred_gender: preferred_gender,
      min_age: min_age ? Number(min_age) : null,
      max_age: max_age ? Number(max_age) : null,
      budget: budget ? new Prisma.Decimal(budget) : null,
      habits: habits,
      room_id: room_id ? Number(room_id) : null,
      ward_id: ward_id ? Number(ward_id) : null,
    },
  });

  return {
    code: 1000,
    message: 'Bạn đã thêm thông tin tìm bạn cùng phòng thành công!',
    data,
  };
};

export const updateRoommate = async (dto: UpdateRoommate, userId: number) => {

  const { title, preferred_gender, min_age, max_age, budget, habits, room_id, roommate_id, status, ward_id } = dto;

  const user = await prisma.users.findUnique({ where: { user_id: userId } });
  if (!user) throw new Error('Người dùng không tồn tại!');
  if (!roommate_id) throw new Error('Thiếu roommate_id!');

  const roommate = await prisma.roommateRequests.findUnique({
    where: { request_id: Number(roommate_id) },
    select: { sender_id: true },
  });

  if (!roommate) throw new Error('Yêu cầu không tồn tại!');
  if (roommate.sender_id !== userId) throw new Error('Bạn không có quyền sửa!');

  if (room_id) {
    const room = await prisma.rooms.findUnique({ where: { room_id: Number(room_id) } });
    if (!room) throw new Error('Phòng không tồn tại!');
  }

  const updateData: any = {
    // Dùng !== undefined thay vì truthy check để giữ được giá trị falsy hợp lệ (vd: budget = 0)
    ...(title !== undefined && { title }),
    ...(preferred_gender !== undefined && { preferred_gender }),
    ...(habits !== undefined && { habits }),
    ...(min_age !== undefined && { min_age: Number(min_age) }),
    ...(max_age !== undefined && { max_age: Number(max_age) }),
    ...(budget !== undefined && { budget: new Prisma.Decimal(budget) }),
    ...(room_id !== undefined && { room_id: Number(room_id) }),
    ...(status !== undefined && { status }),
    ...(ward_id !== undefined && { ward_id: Number(ward_id) }),
  };

  const data = await prisma.roommateRequests.update({
    where: { request_id: Number(roommate_id) },
    data: updateData,
  });

  return { code: 1000, message: 'Cập nhật thành công!', data };
};

export const deleteRoommate = async (roommate_id: number, userId: number) => {
  const user = await prisma.users.findUnique({ where: { user_id: userId } });
  if (!user) throw new Error('Người dùng không tồn tại!');
  if (!roommate_id) throw new Error('Thiếu roommate_id!');

  const roommate = await prisma.roommateRequests.findUnique({
    where: { request_id: Number(roommate_id) },
    select: { sender_id: true },
  });

  if (!roommate) throw new Error('Yêu cầu không tồn tại!');
  if (roommate.sender_id !== userId) throw new Error('Bạn không có quyền xóa!');

  await prisma.roommateRequests.delete({ where: { request_id: Number(roommate_id) } });

  return { code: 1000, message: 'Đã xóa thông tin thành công!' };
};

export const getListRoommate = async (dto: GetListRoommate, userId: number) => {
  const {
    title,
    preferred_gender,
    min_age,
    max_age,
    budget,
    habits,
    ward_id,
    index = 1,
    count = 10,
  } = dto;

  const where: any = {
    ...(title && {
      title: { contains: title, mode: 'insensitive' },
    }),
       ...(preferred_gender && {
      preferred_gender: { equals: preferred_gender },
    }),

    ...(habits && {
      habits: { contains: habits, mode: 'insensitive' },
    }),

    ...(ward_id && { ward_id: Number(ward_id) }),

    ...((min_age || max_age) && {
      min_age: {
        ...(min_age && { gte: Number(min_age) }),
        ...(max_age && { lte: Number(max_age) }),
      },
    }),

    ...(budget && {
      budget: { lte: new Prisma.Decimal(budget) },
    }),
  };

  const skip = (Number(index) - 1) * Number(count);
  const take = Number(count);

  const [list, total] = await Promise.all([
    prisma.roommateRequests.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        sender: { select: { user_id: true, full_name: true, avatar_url: true } },
        room: true,
        ward: true,
      },
    }),
    prisma.roommateRequests.count({ where }),
  ]);

  return {
    code: 1000,
    message: 'Lấy danh sách thành công!',
    data: {
      list,
      pagination: {
        total,
        index: Number(index),
        count: Number(count),
        total_page: Math.ceil(total / Number(count)),
      },
    },
  };
};

export const getListRommateOwner = async (currentUserId: number, targetUserId?: number) => {
  const ownerId = targetUserId || currentUserId;

  const user = await prisma.users.findUnique({ 
    where: { user_id: Number(ownerId) } 
  });
  if (!user) throw new Error('Người dùng không tồn tại!');

  const data = await prisma.roommateRequests.findMany({
    where: { sender_id: Number(ownerId) },
    include: {
      room: {
        include: {
          address: {
            include: { ward: true }
          }
        }
      },
      ward: true,
      sender: {
        select: {
          user_id: true,
          full_name: true,
          avatar_url: true,
          role_id: true,
        }
      }
    },
    orderBy: {
      created_at: 'desc' 
    }
  });

  return {
    code: 1000,
    message: 'Lấy danh sách yêu cầu tìm bạn cùng phòng thành công!',
    data: data
  };
};