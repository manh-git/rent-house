import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
//Room Review
export const CreateRoomReview = async(userId: number, roomId: number, rating: number, comment: string )=>{
    const user = await prisma.users.findUnique({
        where: {user_id: userId},
        select: { role_id: true},
    })
    if(!user) throw new Error('Người dùng không tồn tại!');

    if(user.role_id === 2)throw new Error('Bạn không có quyền review phòng!')
    const room = await prisma.rooms.findUnique({
        where: {room_id: roomId},
    })
    if(!room) throw new Error('Phòng trọ này không tồn tại');
    const data = await prisma.roomReviews.create({
        data: {
            tenant_id: userId,
            rating: rating,
            room_id: roomId,
            comment: comment,
        }
    })
    return {
        code: 1000,
        message: 'Bạn đã review phòng thành công!',
        data: data
    }
} 
export const UpdateRoomReview = async(userId: number, reviewId: number,roomId: number, rating: number, comment: string )=>{
    const user = await prisma.users.findUnique({
        where: {user_id: userId},
        select: { role_id: true},
    })
    if(!user) throw new Error('Người dùng không tồn tại!');

    if(user.role_id === 2)throw new Error('Bạn không có quyền review phòng!')
    const room = await prisma.rooms.findUnique({
        where: {room_id: roomId},
    })
    if(!room) throw new Error('Phòng trọ này không tồn tại');

    const review = await prisma.roomReviews.findUnique({
        where: {review_id: reviewId},
        select: {tenant_id: true},
    })
    if(!review || review.tenant_id !== userId){
        throw new Error('Bạn không có quyền hoặc review này không tồn tại!');
    }
    const data = await prisma.roomReviews.update({
        where: {review_id: reviewId},
        data: {
            tenant_id: userId,
            rating: rating,
            room_id: roomId,
            comment: comment,
        }
    })
    return {
        code: 1000,
        message: 'Bạn đã review phòng thành công!',
        data: data
    }
} 

export const deleteRoomReview = async(userId: number, reviewId: number)=>{

    const user = await prisma.users.findUnique({
        where: {user_id: userId},
        select: { role_id: true},
    })
    if(!user) throw new Error('Người dùng không tồn tại!');

    const review = await prisma.roomReviews.findUnique({
        where: {review_id: reviewId},
        select: {tenant_id: true},
    })
    if(!review || review.tenant_id !== userId){
        throw new Error('Bạn không có quyền hoặc review này không tồn tại!');
    }
    await prisma.roomReviews.delete({
        where: {review_id: reviewId},
    })
    return {
        code: 1000,
        message: 'Xóa thành công!'
    }
}
//roomreview comment
export const createRoomReviewComment = async (userId: number, reviewId: number, content: string) => {
  const review = await prisma.roomReviews.findUnique({
    where: { review_id: reviewId },
    include: { room: { select: { owner_id: true } } },
  });
  if (!review) throw new Error('Review không tồn tại!');
  if (review.room.owner_id !== userId) throw new Error('Chỉ chủ phòng mới được phép reply!');

  const existing = await prisma.roomReviewComments.findUnique({ where: { review_id: reviewId } });
  if (existing) throw new Error('Bạn đã reply review này rồi!');

  const data = await prisma.roomReviewComments.create({
    data: { review_id: reviewId, owner_id: userId, content },
  });

  return { code: 1000, message: 'Reply review thành công!', data };
};

export const updateRoomReviewComment = async (userId: number, commentId: number, content: string) => {
  const comment = await prisma.roomReviewComments.findUnique({ where: { comment_id: commentId } });
  if (!comment || comment.owner_id !== userId)
    throw new Error('Comment không tồn tại hoặc bạn không có quyền sửa!');

  const data = await prisma.roomReviewComments.update({
    where: { comment_id: commentId },
    data: { content, updated_at: new Date() },
  });

  return { code: 1000, message: 'Cập nhật reply thành công!', data };
};

export const deleteRoomReviewComment = async (userId: number, commentId: number) => {
  const comment = await prisma.roomReviewComments.findUnique({ where: { comment_id: commentId } });
  if (!comment || comment.owner_id !== userId)
    throw new Error('Comment không tồn tại hoặc bạn không có quyền xóa!');

  await prisma.roomReviewComments.delete({ where: { comment_id: commentId } });
  return { code: 1000, message: 'Xóa reply thành công!' };
};
//Review User
export const CreateUserReview = async(userId: number, target_user_id: number, rating: number, comment: string )=>{
    const user = await prisma.users.findUnique({
        where: {user_id: userId},
    })
    if(!user) throw new Error('Người dùng không tồn tại!');

    if(user.role_id === 2)throw new Error('Bạn không có quyền review phòng!')
    const room = await prisma.users.findUnique({
        where: {user_id: target_user_id},
    })
    if(!room) throw new Error('Người dùng này không tồn tại');
    const data = await prisma.userReviews.create({
        data: {
            reviewer_id: userId,
            rating: rating,
            target_user_id: target_user_id,
            comment: comment,
        }
    })
    return {
        code: 1000,
        message: 'Bạn đã review người dùng thành công!',
        data: data
    }
} 
export const UpdateUserReview = async(userId: number, uReviewId: number,target_user_id: number, rating: number, comment: string )=>{
    const user = await prisma.users.findUnique({
        where: {user_id: userId},
    })
    if(!user) throw new Error('Người dùng không tồn tại!');

    if(user.role_id === 2)throw new Error('Bạn không có quyền review phòng!')
    const room = await prisma.users.findUnique({
        where: {user_id: target_user_id},
    })
    if(!room) throw new Error('Người dùng này không tồn tại');
    const userReview = await prisma.userReviews.findUnique({
        where: {u_review_id: uReviewId},
        select: {reviewer_id: true}
    })
    if(!userReview || userReview.reviewer_id !== userId){
        throw new Error('Người dùng để review không tồn tại hoặc bạn không có quyền sửa!');
    }
    const data = await prisma.userReviews.update({
        where: {u_review_id: uReviewId},
        data: {
            reviewer_id: userId,
            rating: rating,
            target_user_id: target_user_id,
            comment: comment,
        }
    })
    return {
        code: 1000,
        message: 'Bạn đã update review người dùng thành công!',
        data: data
    }
} 
export const deleteUserReview = async(userId: number, uReviewId: number)=>{
    const user = await prisma.users.findUnique({
        where: {user_id: userId},
    })
    if(!user) throw new Error('Người dùng không tồn tại!');
    const userReview = await prisma.userReviews.findUnique({
        where: {u_review_id: uReviewId},
        select: {reviewer_id: true}
    })
    if(!userReview || userReview.reviewer_id !== userId){
        throw new Error('Người dùng để review không tồn tại hoặc bạn không có quyền sửa!');
    }
    await prisma.userReviews.delete({
        where: {u_review_id: uReviewId},
    })
    return {
        code: 1000,
        message: 'Bạn đã xóa review này thành công!'
    }
}

//comment user review
export const createUserReviewComment = async (userId: number, reviewId: number, content: string) => {
  const review = await prisma.userReviews.findUnique({
    where: { u_review_id: reviewId },
    select: { target_user_id: true },
  });
  if (!review) throw new Error('Review không tồn tại!');
  if (review.target_user_id !== userId) throw new Error('Chỉ người được review mới được phép reply!');

  const existing = await prisma.userReviewComments.findUnique({ where: { review_id: reviewId } });
  if (existing) throw new Error('Bạn đã reply review này rồi!');

  const data = await prisma.userReviewComments.create({
    data: { review_id: reviewId, target_user_id: userId, content },
  });

  return { code: 1000, message: 'Reply review thành công!', data };
};

export const updateUserReviewComment = async (userId: number, commentId: number, content: string) => {
  const comment = await prisma.userReviewComments.findUnique({ where: { comment_id: commentId } });
  if (!comment || comment.target_user_id !== userId)
    throw new Error('Comment không tồn tại hoặc bạn không có quyền sửa!');

  const data = await prisma.userReviewComments.update({
    where: { comment_id: commentId },
    data: { content, updated_at: new Date() },
  });

  return { code: 1000, message: 'Cập nhật reply thành công!', data };
};

export const deleteUserReviewComment = async (userId: number, commentId: number) => {
  const comment = await prisma.userReviewComments.findUnique({ where: { comment_id: commentId } });
  if (!comment || comment.target_user_id !== userId)
    throw new Error('Comment không tồn tại hoặc bạn không có quyền xóa!');

  await prisma.userReviewComments.delete({ where: { comment_id: commentId } });
  return { code: 1000, message: 'Xóa reply thành công!' };
}


// Lấy 1 review user
export const getUserReview = async (uReviewId: number) => {
  const data = await prisma.userReviews.findUnique({
    where: { u_review_id: uReviewId },
    include: {
      reviewer: { select: { user_id: true, full_name: true, avatar_url: true } },
      target_user: { select: { user_id: true, full_name: true, avatar_url: true } },
      comment: true,
    },
  });
  if (!data) throw new Error('Review không tồn tại!');
  return { code: 1000, message: 'Lấy review thành công!', data };
};

// Lấy danh sách review của 1 user
export const getListUserReview = async (targetUserId: number, page = 1, limit = 10) => {
  const target = await prisma.users.findUnique({ where: { user_id: targetUserId } });
  if (!target) throw new Error('Người dùng không tồn tại!');

  const [data, total] = await Promise.all([
    prisma.userReviews.findMany({
      where: { target_user_id: targetUserId },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        reviewer: { select: { user_id: true, full_name: true, avatar_url: true } },
        comment: true,
      },
    }),
    prisma.userReviews.count({ where: { target_user_id: targetUserId } }),
  ]);

  return {
    code: 1000,
    message: 'Lấy danh sách review thành công!',
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};
// Lấy 1 review phòng trọ chi tiết (kèm theo reply của chủ nhà)
export const getRoomReview = async (reviewId: number) => {
  const data = await prisma.roomReviews.findUnique({
    where: { review_id: reviewId },
    include: {
      tenant: { 
        select: { user_id: true, full_name: true, avatar_url: true } 
      },
      room: { 
        select: { room_id: true, owner_id: true } 
      },
      review_comment: true, 
    },
  });

  if (!data) throw new Error('Review phòng trọ này không tồn tại!');

  return { 
    code: 1000, 
    message: 'Lấy thông tin review thành công!', 
    data 
  };
};

// Lấy danh sách toàn bộ review của 1 phòng trọ (có phân trang)
export const getListRoomReview = async (roomId: number, page = 1, limit = 10) => {
  const room = await prisma.rooms.findUnique({ where: { room_id: roomId } });
  if (!room) throw new Error('Phòng trọ không tồn tại!');

  const [data, total] = await Promise.all([
    prisma.roomReviews.findMany({
      where: { room_id: roomId },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        tenant: { 
          select: { user_id: true, full_name: true, avatar_url: true } 
        },
        review_comment: true, 
      },
    }),
    prisma.roomReviews.count({ where: { room_id: roomId } }),
  ]);

  return {
    code: 1000,
    message: 'Lấy danh sách review phòng thành công!',
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};