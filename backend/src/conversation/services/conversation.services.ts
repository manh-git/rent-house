import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getConversation = async(userId: number, convId: number, limit: number, page: number
)=>{
    const user = await prisma.users.findUnique({
        where: {user_id: userId},
    })
    if(!user) throw new Error('Người dùng không tồn tại!');

    const conversation = await prisma.conversations.findUnique({
        where: {conv_id: convId},
        select: {
            user1_id: true,
            user2_id: true,     
        }
    })
    if(!conversation)throw new Error('Cuộc hội thoại không tồn tại!');

    if(userId !== conversation.user1_id && userId !== conversation.user2_id){
        throw new Error('Bạn không có quyền truy cập cuộc hội thoại này!');
    }

    const mess = await prisma.messages.findMany({
      where: { conv_id: convId },
      orderBy: { sent_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        media: {
            select: {
                file_type: true,
                file_url: true
            }
        }
      }
    });
    return {
        code: 1000,
        message: 'Lấy tin nhắn thành công!',
        data: mess
    }

}
export const getListConv = async(userId: number)=>{
    const user = await prisma.users.findUnique({
        where: {user_id: userId},
    })
    if(!user) throw new Error('Người dùng không tồn tại!');

    const conversations = await prisma.conversations.findMany({
      where: {
        OR: [{ user1_id: userId }, { user2_id: userId }],
      },
      orderBy: { last_message_at: 'desc' },
      include: {
        user1: { select: { user_id: true, full_name: true, avatar_url: true, last_seen: true } },
        user2: { select: { user_id: true, full_name: true, avatar_url: true, last_seen: true } },
        messages: { orderBy: { sent_at: 'desc' }, take: 1 },
        _count: {
            select: {
                messages: {
                    where: {
                        is_read: false, 
                        sender_id: {not: userId}
                    }
                }
            }
        }
      },
    });

    return {
        code: 1000,
        message: 'Lấy cuộc hội thoại thành công!',
        data: conversations,
    }
}

export const findExistingRoom = async (currentUserId: number, receiverId: number) => {
    const conversation = await prisma.conversations.findFirst({
        where: {
            OR: [
                { user1_id: currentUserId, user2_id: receiverId },
                { user1_id: receiverId, user2_id: currentUserId }
            ]
        },
        select: {
            conv_id: true
        }
    });

    return {
        code: 1000,
        message: 'Tìm kiếm phòng chat thành công!',
        data: conversation ? conversation.conv_id : null // Trả về ID hoặc null nếu chưa có phòng
    };
}

export const getUnreadMessagesCount = async (userId: number) => {
    const unreadCount = await prisma.messages.count({
        where: {
            is_read: false,
            sender_id: { not: userId }, // Chỉ đếm tin nhắn của đối phương gửi
            conversation: {
                OR: [
                    { user1_id: userId },
                    { user2_id: userId }
                ]
            }
        }
    });

    return {
        code: 1000,
        message: 'Lấy số lượng tin nhắn chưa đọc thành công!',
        data: unreadCount
    };
};

export const markAsRead = async (userId: number, convId: number) => {
    await prisma.messages.updateMany({
        where: {
            conv_id: convId,
            sender_id: { not: userId }, 
            is_read: false
        },
        data: {
            is_read: true
        }
    });

    return {
        code: 1000,
        message: 'Đã cập nhật trạng thái đã đọc thành công!',
        data: true
    };
};
export const getConversationImages = async (userId: number, convId: number) => {
    // Kiểm tra quyền truy cập phòng chat trước để bảo mật dữ liệu
    const conversation = await prisma.conversations.findUnique({
        where: { conv_id: convId },
        select: { user1_id: true, user2_id: true }
    });
    
    if (!conversation) throw new Error('Cuộc hội thoại không tồn tại!');
    if (userId !== conversation.user1_id && userId !== conversation.user2_id) {
        throw new Error('Bạn không có quyền truy cập dữ liệu này!');
    }

    // Lấy tất cả media có loại dữ liệu là 'image' thuộc cuộc hội thoại này
    const images = await prisma.media.findMany({
        where: {
            message: {
                conv_id: convId
            }
        },
        select: {
            file_url: true,
            message: {
                select: {
                    sent_at: true,
                    sender_id: true
                }
            }
        },
        orderBy: {
            message: {
                sent_at: 'desc' 
            }
        }
    });

    return {
        code: 1000,
        message: 'Lấy danh sách hình ảnh thành công!',
        data: images
    };
};