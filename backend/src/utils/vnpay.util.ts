import crypto from 'crypto';

const VNP_TMNCODE = process.env.VNP_TMNCODE!;
const VNP_HASHSECRET = process.env.VNP_HASHSECRET!;
const VNP_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_RETURNURL = process.env.VNP_RETURNURL!;

export interface VNPayParams {
  amount: number;
  orderInfo: string;
  txnRef: string;
  ipAddr: string;
  bankCode?: string;
}

const hmacSHA512 = (data: string): string => {
  return crypto
    .createHmac('sha512', VNP_HASHSECRET)
    .update(Buffer.from(data, 'utf-8'))
    .digest('hex');
};

// Sắp xếp object theo key alphabet
const sortObject = (obj: Record<string, string>) => {
  const sorted: Record<string, string> = {};
  Object.keys(obj).sort().forEach(key => { sorted[key] = obj[key] ||""; });
  return sorted;
};

export const createVNPayUrl = (params: VNPayParams): string => {
  const vnTime = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNP_TMNCODE,
    vnp_Amount: String(Math.round(params.amount * 100)),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.txnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: 'billpayment',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: VNP_RETURNURL,
    vnp_IpAddr: ['::1', '::ffff:127.0.0.1'].includes(params.ipAddr)
      ? '127.0.0.1' : params.ipAddr,
    vnp_CreateDate: fmt(vnTime),
    vnp_ExpireDate: fmt(new Date(vnTime.getTime() + 15 * 60 * 1000)),
  };

  if (params.bankCode) vnpParams.vnp_BankCode = params.bankCode;

  const sorted = sortObject(vnpParams);

  // Tạo signData — encode theo chuẩn VNPay (dùng qs với encode:false rồi tự encode value)
  const signData = Object.entries(sorted)
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
    .join('&');

  const secureHash = hmacSHA512(signData);

  return `${VNP_URL}?${signData}&vnp_SecureHash=${secureHash}`;
};

export const verifyVNPayReturn = (query: Record<string, string>) => {
  const secureHash = query.vnp_SecureHash;
  const responseCode = query.vnp_ResponseCode;

  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const sorted = sortObject(params);

  // Verify — dùng cùng cách encode
  const signData = Object.entries(sorted)
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
    .join('&');

  const checkHash = hmacSHA512(signData);


  return {
    isValid: checkHash === secureHash,
    isSuccess: responseCode === '00',
    txnRef: query.vnp_TxnRef,
    amount: Number(query.vnp_Amount) / 100,
    responseCode,
  };
};

export const getVNPayMessage = (code: string): string => {
  const messages: Record<string, string> = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ',
    '09': 'Thẻ/Tài khoản chưa đăng ký Internet Banking',
    '10': 'Xác thực thông tin thẻ/tài khoản quá 3 lần',
    '11': 'Đã hết hạn chờ thanh toán',
    '12': 'Thẻ/Tài khoản bị khóa',
    '13': 'Sai mật khẩu xác thực OTP',
    '24': 'Khách hàng hủy giao dịch',
    '51': 'Tài khoản không đủ số dư',
    '65': 'Vượt quá hạn mức giao dịch trong ngày',
    '75': 'Ngân hàng thanh toán đang bảo trì',
    '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
    '99': 'Lỗi không xác định',
  };
  return messages[code] ?? 'Lỗi không xác định';
};