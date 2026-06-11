import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import redis from '../utils/redis.util.js';
import { createVNPayUrl, verifyVNPayReturn } from '../utils/vnpay.util.js';
import { sendContractEmail } from '../utils/mailer.util.js';
import { generateContractPDF } from '../utils/pdf.util.js';
import { getVNPayMessage } from '../utils/vnpay.util.js';
import { createNotification } from '../notification/notification.service.js';
const prisma = new PrismaClient();
const OTP_TTL = 60 * 10; // 10 phút

// ═══════════════════════════════════════════════════════════════
// TẠO HỢP ĐỒNG NHÁP
// ═══════════════════════════════════════════════════════════════
export const createContract = async (ownerId: number, data: {
  room_id: number;
  tenant_id: number;
  start_date: string;
  end_date?: string;
  monthly_rent: number;
  deposit_amount: number;
  draft_data?: any;
  owner_confirmed?: boolean;
}) => {
  // Kiểm tra phòng thuộc chủ không
  const room = await prisma.rooms.findUnique({
    where: { room_id: data.room_id },
    include: { owner: true },
  });
  if (!room) throw new Error('Phòng không tồn tại!');
  if (room.owner_id !== ownerId) throw new Error('Bạn không có quyền tạo hợp đồng cho phòng này!');

  // Kiểm tra đã có hợp đồng active chưa
  const existing = await prisma.contracts.findFirst({ where: { room_id: data.room_id , status: {not: 'cancel'}} });
  if (existing && existing.status!== 'cancel') throw new Error('Phòng này đã có hợp đồng!');

  // Kiểm tra tenant tồn tại
  const tenant = await prisma.users.findUnique({ where: { user_id: data.tenant_id } });
  if (!tenant) throw new Error('Người thuê không tồn tại!');

  const contract = await prisma.contracts.create({
    data: {
      room_id: data.room_id,
      tenant_id: data.tenant_id,
      start_date: new Date(data.start_date),
      end_date: data.end_date ? new Date(data.end_date) : null,
      monthly_rent: data.monthly_rent,
      deposit_amount: data.deposit_amount,
      status: 'pending_tenant',
      draft_data: data.draft_data ?? {},
      owner_confirmed: true,
    },
    include: {
      room: { include: { address: { include: { ward: true } }, owner: true } },
      tenant: true,
    },
  });

  await createNotification({
    user_id: contract.tenant_id,
    type: 'contract_invite',
    title: 'Hợp đồng mới',
    body: `Bạn đã nhận được lời mời ký hợp đồng cho phòng tại ${contract.room.address.detail.split(',').slice(0, -2).join(', ')}.`,
    data: { contract_id: contract.contract_id },
  });
  

  // Gửi email thông báo cho tenant
  await sendContractEmail(tenant.email, {
    type: 'invite',
    contractId: contract.contract_id,
    ownerName: room.owner.full_name ?? 'Chủ phòng',
    address: `${contract.room.address.detail.split(',').slice(0, -2).join(', ')}, ${contract.room.address.ward.ward_name}`,
    monthlyRent: data.monthly_rent,
    depositAmount: data.deposit_amount,
    startDate: data.start_date,
  });

  return { code: 1000, message: 'Tạo hợp đồng thành công!', data: contract };
};


export const getContract = async (contractId: number, userId: number) => {
  

  const contract = await prisma.contracts.findUnique({
    where: { contract_id: contractId },
    include: {
      room: {
        include: {
          address: { include: { ward: true } },
          owner: { select: { user_id: true, full_name: true, email: true, phone: true, avatar_url: true } },
        },
      },
      tenant: { select: { user_id: true, full_name: true, email: true, phone: true, avatar_url: true } },
      signatures: { include: { user: { select: { user_id: true, full_name: true } } } },
      payments: true
    },
  });

  if (!contract) throw new Error('Hợp đồng không tồn tại!');

  const isOwner = contract.room.owner_id === userId;
  const isTenant = contract.tenant_id === userId;
  if (!isOwner && !isTenant) throw new Error('Bạn không có quyền xem hợp đồng này!');

  return { code: 1000, message: 'Lấy thông tin hợp đồng thành công!', data: contract };
};


export const tenantConfirm = async (contractId: number, tenantId: number) => {
  const contract = await prisma.contracts.findUnique({
    where: { contract_id: contractId },
    include: { room: { include: { owner: true } } },
  });

  
  if (!contract) throw new Error('Hợp đồng không tồn tại!');
  if (contract.tenant_id !== tenantId) throw new Error('Bạn không có quyền xác nhận hợp đồng này!');
  if (contract.tenant_confirmed) throw new Error('Bạn đã xác nhận hợp đồng này rồi!');
  if (contract.status === 'cancelled') throw new Error('Hợp đồng đã bị hủy!');

  const updated = await prisma.contracts.update({
    where: { contract_id: contractId },
    data: { tenant_confirmed: true, status: 'pending_signature' },
  });

  // Thông báo cho owner
  await sendContractEmail(contract.room.owner.email, {
      type: 'ready_to_sign',
      contractId,
    });

  await createNotification({
    user_id: contract.room.owner_id,
    type: 'contract_ownerConfirm',
    title: 'Người thuê đã xác nhận hợp đồng',
    body:'Người thuê đã xác nhận hợp đồng. Sẵn sàng kí',
    data: {contract_id: contract.contract_id}
  })

  return { code: 1000, message: 'Xác nhận hợp đồng thành công!', data: updated };
};



// ═══════════════════════════════════════════════════════════════
// GỬI OTP ĐỂ KÝ HỢP ĐỒNG
// ═══════════════════════════════════════════════════════════════
export const requestSignOTP = async (contractId: number, userId: number) => {
  const contract = await prisma.contracts.findUnique({
    where: { contract_id: contractId },
    include: { room: true },
  });

  if (!contract) throw new Error('Hợp đồng không tồn tại!');

  const isOwner = contract.room.owner_id === userId;
  const isTenant = contract.tenant_id === userId;
  if (!isOwner && !isTenant) throw new Error('Bạn không có quyền ký hợp đồng này!');
  if (!contract.owner_confirmed || !contract.tenant_confirmed)
    throw new Error('Cả hai bên cần xác nhận trước khi ký!');

  // Kiểm tra đã ký chưa
  const existing = await prisma.signatures.findFirst({
    where: { contract_id: contractId, user_id: userId },
  });
  if (existing) throw new Error('Bạn đã ký hợp đồng này rồi!');

  // Tạo OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`sign_otp:${contractId}:${userId}`, otp, 'EX', OTP_TTL);

  const user = await prisma.users.findUnique({ where: { user_id: userId } });
  await sendContractEmail(user!.email, { type: 'sign_otp', otp, contractId });

  return { code: 1000, message: 'Đã gửi OTP qua email!' };
};

// ═══════════════════════════════════════════════════════════════
// KÝ HỢP ĐỒNG BẰNG OTP
// ═══════════════════════════════════════════════════════════════
export const signContract = async (
  contractId: number,
  userId: number,
  otp: string,
  ip: string,
) => {
  const stored = await redis.get(`sign_otp:${contractId}:${userId}`);
  if (!stored) throw new Error('OTP đã hết hạn!');
  if (stored !== otp) throw new Error('OTP không chính xác!');
  await redis.del(`sign_otp:${contractId}:${userId}`);

  const contract = await prisma.contracts.findUnique({
    where: { contract_id: contractId },
    include: {
      room: { include: { owner: true, address: { include: {
        ward: true
      }} } },
      tenant: true,
      signatures: true,
    },
  });

  if (!contract) throw new Error('Hợp đồng không tồn tại!');

  const isOwner = userId === contract.room.owner_id;
  const isTenant = userId === contract.tenant_id;
  if (!isOwner && !isTenant) throw new Error('Bạn không có quyền ký hợp đồng này!');

  const alreadySigned = contract.signatures.some(s => s.user_id === userId);
  if (alreadySigned) throw new Error('Bạn đã ký hợp đồng này rồi!');

  await prisma.signatures.create({
    data: {
      contract_id: contractId,
      user_id: userId,
      signature_ip: ip,
    },
  });

  const signatures = await prisma.signatures.findMany({ where: { contract_id: contractId }});
  const ownerSigned = signatures.some(s => s.user_id === contract.room.owner_id);
  const tenantSigned = signatures.some(s => s.user_id === contract.tenant_id);

  if (ownerSigned && tenantSigned) {
    const pdfUrl = await generateContractPDF(contract);
    await prisma.contracts.update({
      where: { contract_id: contractId },
      data: { status: 'signed', contract_url: pdfUrl },
    });

    await sendContractEmail(contract.room.owner.email, { type: 'contract_signed', contractId, pdfUrl });
    await sendContractEmail(contract.tenant.email, { type: 'contract_signed', contractId, pdfUrl });
    
    return { code: 1000, message: 'Ký thành công! Hợp đồng đã có hiệu lực.' };
  } else {
    return { code: 1000, message: 'Ký thành công! Đang chờ bên còn lại xác nhận.' };
  }
};

// GHI NHẬN TIỀN CỌC (VNPay/MoMo callback)
export const confirmDeposit = async (contractId: number, paymentData: {
  amount: number;
  payment_method: string;
  transaction_id: string;
}) => {
  const contract = await prisma.contracts.findUnique({
    where: { contract_id: contractId },
    include: { room: { include: { owner: true } }, tenant: true },
  });

  if (!contract) throw new Error('Hợp đồng không tồn tại!');
  if (contract.deposit_paid) throw new Error('Tiền cọc đã được thanh toán!');
  if (contract.status !== 'pending_deposit' && contract.status !== 'signed')
    throw new Error('Hợp đồng chưa sẵn sàng nhận cọc!');

  const updated = await prisma.contracts.update({
    where: { contract_id: contractId },
    data: {
      deposit_paid: true,
      status: 'active',
      escrow_status: 'holding',
      escrow_release_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.rooms.update({
      where: { room_id: contract.room_id },
      data: { is_rented: true }, 
    });
  await prisma.payments.create({
      data: {
        contract_id: contractId,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        transaction_id: paymentData.transaction_id,
        status: 'completed'
      }
    });

  // Gửi thông báo
  await sendContractEmail(contract.room.owner.email, {
    type: 'deposit_received',
    contractId,
    amount: paymentData.amount,
    transactionId: paymentData.transaction_id,
  });

  return { code: 1000, message: 'Xác nhận tiền cọc thành công! Hợp đồng đã có hiệu lực!', data: updated };
};



// HỦY HỢP ĐỒNG
export const cancelContract = async (contractId: number, userId: number, reason: string) => {
  const contract = await prisma.contracts.findUnique({
    where: { contract_id: contractId },
    include: { room: true, tenant: true },
  });

  if (!contract) throw new Error('Hợp đồng không tồn tại!');

  const isOwner = contract.room.owner_id === userId;
  const isTenant = contract.tenant_id === userId;
  if (!isOwner && !isTenant) throw new Error('Bạn không có quyền hủy hợp đồng này!');

  if (contract.deposit_paid) {
    await prisma.rooms.update({
      where: { room_id: contract.room_id },
      data: { is_rented: false },
    });
  }
  // Nếu đã cọc rồi thì mới vào luồng chờ 2 ngày
  const needsEscrowProcess = contract.deposit_paid === true;

  const updated = await prisma.contracts.update({
    where: { contract_id: contractId },
    data: { 
      status: 'cancel',
      reason_cancel: reason,
      cancelled_by_user_id: userId
    },
  });

  const receiverId = isOwner ? contract.tenant_id : contract.room.owner_id;
  const senderName = isOwner ? "Chủ trọ" : "Người thuê";

  if (needsEscrowProcess) {
    // TH1: Đã cọc -> Gửi thông báo chờ 2 ngày khiếu nại
    await prisma.notifications.create({
      data: {
        user_id: receiverId,
        type: 'contract_cancelled',
        title: 'Hợp đồng đã bị hủy',
        body: `${senderName} đã hủy hợp đồng. Bạn có 2 ngày để khiếu nại với Admin. Sau 2 ngày, hệ thống sẽ mở quyền rút cọc.`,
        data: JSON.stringify({ contract_id: contractId })
      }
    });

    await prisma.notifications.create({
      data: {
        user_id: userId,
        type: 'contract_cancelled',
        title: 'Hủy hợp đồng thành công',
        body: 'Yêu cầu hủy đã được ghi nhận. Hệ thống đang chờ 2 ngày để xử lý khiếu nại trước khi cho phép rút cọc.',
        data: JSON.stringify({ contract_id: contractId })
      }
    });
  } else {
    // TH2: Chưa cọc -> Thông báo hủy đơn giản, không cần giải ngân
    await prisma.notifications.create({
      data: {
        user_id: receiverId,
        type: 'contract_cancelled',
        title: 'Hợp đồng đã bị hủy',
        body: `Hợp đồng #${contractId} đã bị hủy bởi ${senderName}.`,
        data: JSON.stringify({ contract_id: contractId })
      }
    });
  }

  return { code: 1000, message: 'Hủy hợp đồng thành công!', data: updated };
};

// TẠO LINK THANH TOÁN TIỀN CỌC VNPay
export const createDepositPaymentUrl = async (
  contractId: number,
  tenantId: number,
  ip: string,
) => {
  const contract = await prisma.contracts.findUnique({
    where: { contract_id: contractId },
    include: { room: { include: { address: true } } },
  });

  if (!contract) throw new Error('Hợp đồng không tồn tại!');
  if (contract.tenant_id !== tenantId) throw new Error('Bạn không có quyền thanh toán hợp đồng này!');
  if (contract.deposit_paid) throw new Error('Tiền cọc đã được thanh toán!');
  if (contract.status !== 'pending_deposit' && contract.status !== 'signed')
    throw new Error('Hợp đồng chưa sẵn sàng nhận cọc!');

  const txnRef = `DEP_${contractId}_${Date.now()}`;

  await redis.set(`vnpay_txn:${txnRef}`, contractId, 'EX', 60 * 20); // 20 phút

  const paymentUrl = createVNPayUrl({
    amount: Number(contract.deposit_amount),
    orderInfo: `Tiencochd${contractId}`,
    txnRef,
    ipAddr: ip,
  });

  return { code: 1000, message: 'Tạo link thanh toán thành công!', data: { paymentUrl, txnRef } };
};

// ═══════════════════════════════════════════════════════════════
// XỬ LÝ CALLBACK TỪ VNPAY
// ═══════════════════════════════════════════════════════════════
export const handleVNPayReturn = async (query: Record<string, string>) => {
  const result = verifyVNPayReturn(query);

  if (!result.isValid) throw new Error('Chữ ký không hợp lệ!');

  // Lấy contractId từ Redis
  const contractId = await redis.get(`vnpay_txn:${result.txnRef}`);
  if (!contractId) throw new Error('Giao dịch không tồn tại hoặc đã hết hạn!');

  if (!result.isSuccess) {
    return {
      code: 400,
      message: getVNPayMessage(result.responseCode),
      data: { success: false, responseCode: result.responseCode },
    };
  }

  // Xác nhận thanh toán
  const updated = await confirmDeposit(Number(contractId), {
    amount: result.amount,
    payment_method: 'vnpay',
    transaction_id: result.txnRef,
  });

  await redis.del(`vnpay_txn:${result.txnRef}`);

  return {
    code: 1000,
    message: 'Thanh toán tiền cọc thành công!',
    data: { success: true, contract: updated.data },
  };
};

export const checkExpiredCancelContracts = async () => {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  
  // Tìm các hợp đồng đã hủy quá 2 ngày
  const contracts = await prisma.contracts.findMany({
    where: { 
      status: 'cancel',
      deposit_paid: true,
      updated_at: { lte: twoDaysAgo },
      escrow_status: 'holding' 
    },
    include: { room: true }
  });

  for (const contract of contracts) {
    const receiverId = contract.cancelled_by_user_id === contract.tenant_id 
      ? contract.room.owner_id 
      : contract.tenant_id;

    await prisma.notifications.create({
      data: {
        user_id: receiverId,
        type: 'escrow_action_required',
        title: 'Đủ điều kiện nhận tiền cọc',
        body: `Hợp đồng #${contract.contract_id} đã hết thời gian khiếu nại. Vui lòng điền thông tin ngân hàng để Admin thực hiện thủ tục hoàn cọc/giải ngân.`,
        data: JSON.stringify({ contract_id: contract.contract_id })
      }
    });
  }
};

export const submitWithdrawalRequest = async ( data: {
  contract_id: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
}) => {
  const contract = await prisma.contracts.findUnique({ where: { contract_id: data.contract_id },
  include: {
    room: {
      include: {
        owner: true
      }
    }
  } });
  
  if (!contract || contract.status !== 'cancel') 
    throw new Error('Hợp đồng không khả dụng để giải ngân!');

  await prisma.withdrawalRequests.create({
    data: {
      ...data,
      owner_id: contract.room.owner.user_id,
      amount: contract.deposit_amount!
    }
  });

  await prisma.contracts.update({
    where: { contract_id: data.contract_id },
    data: { escrow_status: 'pending_admin_transfer' } // Admin sẽ thấy trạng thái này
  });

  return { message: 'Đã gửi yêu cầu giải ngân, chờ Admin xử lý!' };
};
export const getWithdrawalRequest = async (contractId: number) => {
  return await prisma.withdrawalRequests.findFirst({
    where: { contract_id: contractId }
  });
};

export const updateWithdrawalRequest = async (requestId: number, data: any) => {
  return await prisma.withdrawalRequests.update({
    where: { withdrawal_id: requestId },
    data
  });
};




export const getContractsByUser = async (userId: number) => {
  const data =  await prisma.contracts.findMany({
    where: {
      OR: [
        { tenant_id: userId },
        { room: { owner_id: userId } }
      ]
    },
    include: {
      room: { 
        include: { 
          address: { include: { ward: true } }, 
          owner: { select: { user_id: true, full_name: true, phone: true, avatar_url: true } } 
        } 
      },
      tenant: { select: { user_id: true, full_name: true, phone: true, avatar_url: true } },
      signatures: true,
      payments: true
    },
    orderBy: { created_at: 'desc' }
  });
  console.log(data)
  return data;
};
