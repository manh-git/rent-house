import { PrismaClient } from "@prisma/client";
import redis from "../utils/redis.util.js";
import { error } from "node:console";
const prisma = new PrismaClient();

//Khóa tài khoản
export const deleteUser = async(userId: number, targetId: number, actionType: string)=>{
    const user = await prisma.users.findUnique({
        where: {user_id: targetId},
    })
    if(!user)throw new Error('Người dùng không tồn tại!');
    await prisma.users.update({
        where: { user_id: targetId },
        data: { is_active: false },
    });
    await redis.set(`blacklist:${targetId}`, "blocked", "EX", 604800);

    const data = await prisma.adminLogs.create({
        data: {
            admin_id: userId,
            action_type: 'Khóa tài khoản',
            action_details:  actionType ?? 'Không rõ lý do',  
            target_id: targetId,
        }
    })
    return { code: 1000, message: "Đã khóa và đăng xuất tài khoản này." };
}
//mở khóa tài khoản
export const openUser = async(userId: number, targetId: number, actionDetail:string)=>{
    const user = await prisma.users.findUnique({
        where: {user_id: targetId},
    })
    if(!user)throw new Error('Người dùng không tồn tại!');
    await prisma.users.update({
        where: {user_id: targetId},
        data: {
            is_active: true,
        }
    })
    await redis.del(`blacklist:${targetId}`);
    const data = await prisma.adminLogs.create({
        data: {
            admin_id: userId,
            action_type: 'Mở tài khoản',
            action_details:  actionDetail ?? 'Không rõ lý do',  
            target_id: targetId,
        }
    })
    return { code: 1000, message: "Đã mở lại tài khoản thành công." };
}


//xóa bài đăng
export const deletePostRoom = async(userId: number, postId: number, room_id: number,actionDetail: string)=>{
    const user = await prisma.users.findUnique({
        where: {user_id: userId},
    })
    if(!user)throw new Error('Người dùng không tồn tại!');
    const post = await prisma.posts.findUnique({
        where: {post_id: postId},
    })
    
    const room = await prisma.rooms.findUnique({
        where: {room_id: Number(room_id)},
        select: {
            owner_id: true,
            posts: true,
            address_id: true,
            
        }
    });

    const receiverId = room?.owner_id;

    const title = room?.posts?.title;
    if(!post || !room){
        throw new Error('Post này không tồn tại!')
    }
    
    await prisma.$transaction(async (tx) => {

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

        
    });
    if(!receiverId){
        throw error('Người dùng không tồn tại!')
    }

    await prisma.notifications.create({
      data: {
        user_id: receiverId,
        type: 'delete_postRoom',
        title: 'Xóa bài đăng',
        body: `Bài đăng ${title} của bạn đã bị xóa.`,
        data: 'không có'
      }
    });
    await prisma.adminLogs.create({
        data: {
            admin_id: userId,
            action_type: 'Xóa bài đăng và phòng!',
            action_details: actionDetail ?? 'Không rõ lý do',
            target_id: postId
        }
    })
    return {
        code: 1000,
        message: 'Xóa thành công bài đăng!'
    }

}
//xóa tìm roomate
export const deleteRoommate = async(userId: number, postId: number, actionDetail: string)=>{
    const user = await prisma.users.findUnique({
        where: {user_id: userId},
    })
console.log("Post ID value:", postId);

    if(!user)throw new Error('Người dùng không tồn tại!');
    const post = await prisma.roommateRequests.findUnique({
        where: {request_id: Number(postId)}
    })
    if(!post){
        throw new Error('Bài đăng không tồn tại!');
    }
    const receiverId = post.sender_id;
    const title = post.title;
    await prisma.roommateRequests.delete({
        where: { request_id: Number(postId)}
    })

    
    await prisma.notifications.create({
      data: {
        user_id: receiverId,
        type: 'delete_postRoom',
        title: 'Xóa bài đăng',
        body: `Bài đăng ${title} của bạn đã bị xóa.`,
        data: 'không có'
      }
    });
    await prisma.adminLogs.create({
        data: {
            admin_id: userId,
            action_type: 'Xóa bài đăng tìm người ở ghép!',
            action_details: actionDetail ?? 'Không rõ lý do',
            target_id: postId
        }
    })
    return {
        code: 1000,
        message: 'Xóa thành công bài đăng!'
    }


}
// GetList Admin Logs
export const getListAdminLog = async (
    index: number, 
    count: number, 
    key?: string, 
    startDate?: string, 
    endDate?: string
) => {
    const where: any = {};

    if (key) {
        where.action_type = {
            contains: key,
            mode: 'insensitive', 
        };
    }

    if (startDate || endDate) {
        where.created_at = {};
        if (startDate) {
            where.created_at.gte = new Date(startDate); 
        }
        if (endDate) {
            where.created_at.lte = new Date(endDate);   
        }
    }

    const [logs, total] = await Promise.all([
        prisma.adminLogs.findMany({
            where,
            skip: index * count,
            take: count,
            orderBy: {
                created_at: 'desc', 
            },
            include: {
                admin: {
                    select: {
                        user_id: true,
                        full_name: true,
                    }
                }
            }
        }),
        prisma.adminLogs.count({ where })
    ]);

    return {
        code: 1000,
        message: 'Lấy danh sách nhật ký hệ thống thành công!',
        data: logs,
        pagination: {
            total,
            index,
            count,
            totalPages: Math.ceil(total / count)
        }
    };
};



export const getAdminWithdrawalList = async (adminId: number) => {
  // Kiểm tra quyền admin
  const user = await prisma.users.findUnique({ where: { user_id: adminId } });
  if (user?.role_id !== 3 &&  user?.role_id !== 5) throw new Error('Không có quyền truy cập!');

  return await prisma.withdrawalRequests.findMany({
    where: { status: 'pending' },
    include: { contract: true }
  });
};

// 1. Thay đổi quyền truy cập người dùng
export const updateUserRole = async (adminId: number, targetUserId: number, newRoleId: number) => {
    // Kiểm tra quyền admin
    const admin = await prisma.users.findUnique({ where: { user_id: adminId } });
    if (!admin || admin.role_id !== 5) throw new Error('Không có quyền truy cập!');

    const updatedUser = await prisma.users.update({
        where: { user_id: targetUserId },
        data: { role_id: newRoleId }
    });

    // Ghi log hành động
    await prisma.adminLogs.create({
        data: {
            admin_id: adminId,
            action_type: 'Thay đổi quyền truy cập',
            action_details: `Đã đổi role_id của user ${targetUserId} sang ${newRoleId}`,
            target_id: targetUserId
        }
    });

    return { code: 1000, message: "Cập nhật quyền thành công!" };
};

export const updateWithdrawalStatus = async (adminId: number, withdrawalId: number, newStatus: string) => {
    // 1. Kiểm tra quyền Admin
    const admin = await prisma.users.findUnique({ where: { user_id: adminId } });
    if (!admin || (admin.role_id !== 3 && admin.role_id !== 5)) {
        throw new Error('Không có quyền truy cập!');
    }

    // 2. Lấy thông tin yêu cầu rút tiền để lấy contract_id và số tiền
    const withdrawal = await prisma.withdrawalRequests.findUnique({
        where: { withdrawal_id: withdrawalId },
        include: { contract: true }
    });

    if (!withdrawal) throw new Error('Yêu cầu rút tiền không tồn tại!');
    if (withdrawal.status === 'completed') throw new Error('Yêu cầu này đã được xử lý trước đó!');

    // 3. Thực hiện cập nhật đồng bộ (Transaction)
    const result = await prisma.$transaction(async (tx) => {
        // Cập nhật trạng thái yêu cầu rút tiền
        const updatedRequest = await tx.withdrawalRequests.update({
            where: { withdrawal_id: withdrawalId },
            data: { status: newStatus }
        });

        // Nếu status chuyển sang 'completed', ghi nhận hoàn tiền vào bảng Payments
        if (newStatus === 'completed') {
            await tx.payments.create({
                data: {
                    contract_id: withdrawal.contract_id,
                    amount: -Math.abs(withdrawal.amount) , // Ghi âm để thể hiện tiền đi ra
                    payment_method: 'bank_transfer',
                    transaction_id: `REFUND_${withdrawalId}_${Date.now()}`,
                    status: 'refunded',
                    paid_at: new Date()
                }
            });

            // Cập nhật trạng thái hợp đồng về 'refunded'
            await tx.contracts.update({
                where: { contract_id: withdrawal.contract_id },
                data: { escrow_status: 'refunded' }
            });
        }

        // Ghi log hành động của Admin
        await tx.adminLogs.create({
            data: {
                admin_id: adminId,
                action_type: 'Xử lý rút tiền cọc',
                action_details: `Admin đã chuyển trạng thái yêu cầu #${withdrawalId} sang ${newStatus}. Số tiền: ${withdrawal.amount}`,
                target_id: withdrawal.owner_id // hoặc target_id phù hợp
            }
        });

        return updatedRequest;
    });

    return { 
        code: 1000, 
        message: "Cập nhật trạng thái yêu cầu rút tiền thành công!",
        data: result
    };
};

// 3. Lấy các hoạt động liên quan của người dùng (Logs liên quan đến 1 target_id)
export const getUserActivities = async (targetUserId: number, index: number, count: number) => {
    const [logs, total] = await Promise.all([
        prisma.adminLogs.findMany({
            where: { target_id: targetUserId },
            orderBy: { created_at: 'desc' },
            skip: index * count,
            take: count,
            include: {
                admin: { select: { full_name: true } }
            }
        }),
        prisma.adminLogs.count({ where: { target_id: targetUserId } })
    ]);

    return {
        code: 1000,
        data: logs,
        pagination: {
            total,
            index,
            count,
            totalPages: Math.ceil(total / count)
        }
    };
};

// 4. Tìm kiếm người dùng và danh sách người dùng
export const searchUsers = async (index: number, count: number, key?: string) => {
    const where: any = {};
    
    if (key) {
        where.OR = [
            { full_name: { contains: key, mode: 'insensitive' } },
            { email: { contains: key, mode: 'insensitive' } },
            { phone: { contains: key, mode: 'insensitive' } }
        ];
    }

    const [users, total] = await Promise.all([
        prisma.users.findMany({
            where,
            skip: index * count,
            take: count,
            orderBy: { created_at: 'desc' },
            select: {
                user_id: true,
                full_name: true,
                email: true,
                phone: true,
                is_active: true,
                role_id: true,
                created_at: true
            }
        }),
        prisma.users.count({ where })
    ]);

    return {
        code: 1000,
        data: users,
        pagination: {
            total,
            index,
            count,
            totalPages: Math.ceil(total / count)
        }
    };
};
// Lấy danh sách báo cáo
export const getListReport = async (index: number, count: number, status?: string) => {
    const where = status ? { status } : {};
    
    const [reports, total] = await Promise.all([
        prisma.reports.findMany({
            where,
            skip: index * count,
            take: count,
            orderBy: { created_at: 'desc' },
            include: { sender: { select: { full_name: true, email: true } } }
        }),
        prisma.reports.count({ where })
    ]);

    return {
        code: 1000,
        data: reports,
        pagination: { total, index, count, totalPages: Math.ceil(total / count) }
    };
};

// Đánh dấu đã đọc báo cáo (Chỉ cần 1 admin đọc)
export const markReportAsRead = async (adminId: number, reportId: number) => {
    const report = await prisma.reports.findUnique({ where: { report_id: reportId } });
    if (!report) throw new Error('Báo cáo không tồn tại!');

    return await prisma.$transaction(async (tx) => {
        // Cập nhật trạng thái báo cáo
        const updated = await tx.reports.update({
            where: { report_id: reportId },
            data: { status: 'resolved' }
        });

        // Ghi log admin
        await tx.adminLogs.create({
            data: {
                admin_id: adminId,
                action_type: 'Đánh dấu báo cáo đã đọc',
                action_details: `Admin đã xử lý/đọc báo cáo #${reportId}`,
                target_id: reportId
            }
        });
        return updated;
    });
};
//gửi thông báo bất kỳ cho người 
export const sendSystemNotification = async (
    userIds: number[], 
    title: string, 
    body: string, 
    data: any = {}
) => {
    let targetUsers: { user_id: number }[];

    if (userIds.length > 0) {
        // Gửi cho danh sách cụ thể
        targetUsers = userIds.map(id => ({ user_id: id }));
    } else {
        // Gửi cho tất cả ngoại trừ admin (role 3 và 5)
        const allUsers = await prisma.users.findMany({
            where: {
                NOT: {
                    role_id: { in: [3, 5] }
                }
            },
            select: { user_id: true }
        });
        targetUsers = allUsers;
    }

    const notifications = targetUsers.map(u => ({
        user_id: u.user_id,
        type: 'system_announcement',
        title,
        body,
        data
    }));

    return await prisma.notifications.createMany({
        data: notifications
    });
};

export const getReportById = async (reportId: number) => {
  const report = await prisma.reports.findUnique({
    where: { report_id: reportId },
    include: { sender: { select: { full_name: true, email: true } } },
  });
  if (!report) throw new Error('Báo cáo không tồn tại!');
  return { code: 1000, data: report };
};