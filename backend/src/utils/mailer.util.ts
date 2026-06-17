import * as nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
export const confirmAccount = async (to: string, otp: string)=>{
    await transporter.sendMail({
        from: `"My app"<${process.env.SMTP_USER}>`,
        to,
        subject: 'Mã xác nhận gmail!',
        html: `
      <h2>Mã xác nhận của bạn</h2>
      <p>Nhập mã sau để xác nhận tài khoản:</p>
      <h1 style="letter-spacing: 8px; color: #4F46E5;">${otp}</h1>
      <p>Mã có hiệu lực trong 5 phút.</p>
    `,

    })
}
export const sendResetPasswordEmail = async (to: string, otp: string) => {
  await transporter.sendMail({
    from: `"My app"<${process.env.SMTP_USER}>`,
    to,
    subject: 'Đặt lại mật khẩu',
    html: `
           <p>Nhập mã sau để xác nhận tài khoản:</p>
           <h1 style="letter-spacing: 8px; color: #4F46E5;">${otp}</h1>
           <p>Mã có hiệu lực trong 5 phút.</p>`,
  });
};

export const sendContractEmail = async (to: string, data: any) => {
  const subjects: Record<string, string> = {
    invite: 'Bạn được mời ký hợp đồng thuê nhà',
    tenant_confirmed: 'Người thuê đã xác nhận hợp đồng',
    ready_to_sign: 'Hợp đồng sẵn sàng để ký',
    sign_otp: 'Mã OTP ký hợp đồng',
    contract_signed: 'Hợp đồng đã được ký kết thành công',
    deposit_received: 'Xác nhận nhận tiền cọc',
  };

  const bodies: Record<string, string> = {
    invite: `
      <h2>Bạn được mời ký hợp đồng</h2>
      <p>Chủ phòng <strong>${data.ownerName}</strong> đã tạo hợp đồng thuê nhà cho bạn.</p>
      <p>Địa chỉ: <strong>${data.address}</strong></p>
      <p>Giá thuê: <strong>${Number(data.monthlyRent).toLocaleString('vi-VN')} VNĐ/tháng</strong></p>
      <p>Tiền cọc: <strong>${Number(data.depositAmount).toLocaleString('vi-VN')} VNĐ</strong></p>
      <p>Ngày bắt đầu: <strong>${data.startDate}</strong></p>
      <p>Vui lòng đăng nhập ứng dụng để xem và xác nhận hợp đồng #${data.contractId}</p>
    `,
    sign_otp: `
      <h2>Mã OTP ký hợp đồng</h2>
      <p>Mã OTP của bạn để ký hợp đồng #${data.contractId}:</p>
      <h1 style="letter-spacing:8px;color:#4F46E5">${data.otp}</h1>
      <p>Mã có hiệu lực trong 10 phút.</p>
    `,
    contract_signed: `
      <h2>Hợp đồng đã được ký kết!</h2>
      <p>Hợp đồng #${data.contractId} đã được cả hai bên ký kết thành công.</p>
    `,
    deposit_received: `
      <h2>Xác nhận nhận tiền cọc</h2>
      <p>Tiền cọc cho hợp đồng #${data.contractId} đã được thanh toán.</p>
      <p>Số tiền: <strong>${Number(data.amount).toLocaleString('vi-VN')} VNĐ</strong></p>
      <p>Mã giao dịch: <strong>${data.transactionId}</strong></p>
    `,
    tenant_confirmed: `
      <h2>Người thuê đã xác nhận</h2>
      <p><strong>${data.tenantName}</strong> đã xác nhận hợp đồng #${data.contractId}.</p>
      <p>Vui lòng đăng nhập để xác nhận từ phía bạn.</p>
    `,
    ready_to_sign: `
      <h2>Hợp đồng sẵn sàng để ký</h2>
      <p>Cả hai bên đã xác nhận hợp đồng #${data.contractId}. Vui lòng đăng nhập để tiến hành ký.</p>
    `,
  };

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: subjects[data.type],
    html: bodies[data.type],
  });
};