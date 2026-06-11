import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CONTRACT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; padding: 40px; color: #111; }
    h1 { text-align: center; font-size: 20px; text-transform: uppercase; }
    h2 { font-size: 16px; margin-top: 24px; }
    p { line-height: 1.8; margin: 8px 0; }
    .section { margin: 20px 0; }
    .signature-row { display: flex; justify-content: space-between; margin-top: 60px; }
    .signature-box { text-align: center; width: 45%; }
    .divider { border-top: 1px solid #999; margin: 40px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    td, th { border: 1px solid #ddd; padding: 8px 12px; }
    th { background: #f5f5f5; }
    .hash { font-size: 10px; color: #999; word-break: break-all; }
  </style>
</head>
<body>
  <h1>Hợp đồng thuê nhà</h1>
  <p style="text-align:center">Số hợp đồng: <strong>#{{contractId}}</strong></p>
  <p style="text-align:center">Ngày ký: <strong>{{signedDate}}</strong></p>
  <div class="divider"></div>
  <div class="section">
    <h2>I. Thông tin các bên</h2>
    <p><strong>Bên A (Chủ phòng):</strong> {{ownerName}}</p>
    <p>Email: {{ownerEmail}} | SĐT: {{ownerPhone}}</p>
    <p style="margin-top:12px"><strong>Bên B (Người thuê):</strong> {{tenantName}}</p>
    <p>Email: {{tenantEmail}} | SĐT: {{tenantPhone}}</p>
  </div>
  <div class="section">
    <h2>II. Thông tin phòng thuê</h2>
    <p><strong>Địa chỉ:</strong> {{address}}</p>
    <table>
      <tr><th>Thông tin</th><th>Chi tiết</th></tr>
      <tr><td>Giá thuê hàng tháng</td><td>{{monthlyRent}} VNĐ</td></tr>
      <tr><td>Tiền cọc</td><td>{{depositAmount}} VNĐ</td></tr>
      <tr><td>Ngày bắt đầu</td><td>{{startDate}}</td></tr>
      <tr><td>Ngày kết thúc</td><td>{{endDate}}</td></tr>
      <tr><td>Ngày thanh toán</td><td>Ngày {{paymentDueDay}} hàng tháng</td></tr>
    </table>
  </div>
  <div class="section">
    <h2>III. Điều khoản chung</h2>
    <p>1. Bên B có trách nhiệm thanh toán tiền thuê đúng hạn.</p>
    <p>2. Bên B không được tự ý sửa chữa phòng khi chưa có sự đồng ý của Bên A.</p>
    <p>3. Tiền cọc sẽ được hoàn trả khi kết thúc hợp đồng nếu không có thiệt hại.</p>
    <p>4. Bên nào muốn chấm dứt hợp đồng cần thông báo trước 30 ngày.</p>
    <p>5. Mọi tranh chấp giải quyết theo quy định pháp luật Việt Nam.</p>
  </div>
  <div class="section">
    <h2>IV. Chữ ký số</h2>
    {{#each signatures}}
    <p><strong>{{userName}}</strong> — Ký lúc: {{signedAt}} | IP: {{ip}}</p>
    <p class="hash">Hash: {{hash}}</p>
    {{/each}}
  </div>
  <div class="signature-row">
    <div class="signature-box">
      <p><strong>Bên A (Chủ phòng)</strong></p>
      <p>{{ownerName}}</p>
    </div>
    <div class="signature-box">
      <p><strong>Bên B (Người thuê)</strong></p>
      <p>{{tenantName}}</p>
    </div>
  </div>
</body>
</html>
`;

export const generateContractPDF = async (contract: any): Promise<string> => {
  const template = Handlebars.compile(CONTRACT_TEMPLATE);

  // Lấy signatures kèm user info
  const signaturesRaw = await prisma.signatures.findMany({
    where: { contract_id: contract.contract_id },
    include: { user: { select: { full_name: true } } },
  });

  const signatures = signaturesRaw.map(sig => ({
    userName: sig.user.full_name ?? 'Ẩn danh',
    signedAt: new Date(sig.signed_at).toLocaleString('vi-VN'),
    ip: sig.signature_ip,
    hash: crypto
      .createHash('sha256')
      .update(`${sig.contract_id}-${sig.user_id}-${sig.signature_ip}`)
      .digest('hex'),
  }));

  const html = template({
    contractId: contract.contract_id,
    signedDate: new Date().toLocaleDateString('vi-VN'),
    ownerName: contract.room.owner.full_name ?? 'Ẩn danh',
    ownerEmail: contract.room.owner.email,
    ownerPhone: contract.room.owner.phone ?? 'N/A',
    tenantName: contract.tenant.full_name ?? 'Ẩn danh',
    tenantEmail: contract.tenant.email,
    tenantPhone: contract.tenant.phone ?? 'N/A',
    address: `${contract.room.address.detail}, ${contract.room.address.ward.ward_name}`,
    monthlyRent: Number(contract.monthly_rent).toLocaleString('vi-VN'),
    depositAmount: Number(contract.deposit_amount).toLocaleString('vi-VN'),
    startDate: new Date(contract.start_date).toLocaleDateString('vi-VN'),
    endDate: contract.end_date
      ? new Date(contract.end_date).toLocaleDateString('vi-VN')
      : 'Không xác định',
    paymentDueDay: contract.payment_due_day,
    signatures,
  });

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '20px', bottom: '20px' } });
  await browser.close();

  // Tạo thư mục nếu chưa có
  if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

  const fileName = `contract_${contract.contract_id}_${Date.now()}.pdf`;
  const outputPath = `./uploads/${fileName}`;
  fs.writeFileSync(outputPath, pdfBuffer);

  return `${process.env.SERVER_URL}/uploads/${fileName}`;
};