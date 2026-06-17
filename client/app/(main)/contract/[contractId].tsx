import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, ActivityIndicator, Alert, TextInput,
  Linking, Image, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/authStore';
import {
  getContractAPI, tenantConfirmAPI, requestSignOTPAPI,
  signContractAPI, createPaymentUrlAPI, cancelContractAPI,
} from '@/store/contract.service';
import { WebView } from 'react-native-webview';
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft:            { label: 'Nháp', color: '#6B7280', bg: '#F3F4F6' },
  pending_tenant:   { label: 'Chờ người thuê xác nhận', color: '#F59E0B', bg: '#FFFBEB' },
  pending_signature:{ label: 'Chờ ký kết', color: '#3B82F6', bg: '#EFF6FF' },
  pending_deposit:  { label: 'Chờ thanh toán cọc', color: '#8B5CF6', bg: '#F5F3FF' },
  signed:           { label: 'Đã ký - Chờ cọc', color: '#8B5CF6', bg: '#F5F3FF' },
  active:           { label: 'Đang hiệu lực', color: '#10B981', bg: '#ECFDF5' },
  cancelled:        { label: 'Đã hủy', color: '#EF4444', bg: '#FEF2F2' },
};

export default function ContractDetailScreen() {
  const { contractId } = useLocalSearchParams<{ contractId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [signing, setSigning] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);


  
  const fetchContract = useCallback(async () => {
    try {
      const res = await getContractAPI(Number(contractId));
      setContract(res.data);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể tải hợp đồng!');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => { fetchContract(); }, [fetchContract]);

  const isOwner = Number(user?.id) === Number(contract?.room?.owner_id);
  const isTenant = Number(user?.id) === Number(contract?.tenant_id);
  const [reason, setReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const hasSigned = contract?.signatures?.some((s: any) => s.user_id === user?.id);
  const canSign = contract?.status === 'pending_signature' && !hasSigned;
  const canConfirm = isTenant && contract?.status === 'pending_tenant' && !contract?.tenant_confirmed;
  const canPay = isTenant && (contract?.status === 'signed' || contract?.status === 'pending_deposit') && !contract?.deposit_paid;

  const handleConfirm = async () => {
    if(Platform.OS === 'web'){
        const isConfirmed = window.confirm('Bạn đồng ý với các điều khoản trong hợp đồng?');
                window.alert('Thành công');
                
        if(isConfirmed){
            setConfirming(true);
            await tenantConfirmAPI(Number(contractId));
            fetchContract()
        }      
              }
              
    Alert.alert(
      'Xác nhận hợp đồng',
      'Bạn đồng ý với các điều khoản trong hợp đồng?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận', onPress: async () => {
            try {
              setConfirming(true);
              await tenantConfirmAPI(Number(contractId));
              
              Alert.alert(' Thành công', 'Đã xác nhận! Cả hai bên có thể tiến hành ký hợp đồng.');
              fetchContract();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Xác nhận thất bại!');
            } finally {
              setConfirming(false);
            }
          }
        },
      ]
    );
  };

  const handleRequestOTP = async () => {
    try {
      setSendingOtp(true);
      await requestSignOTPAPI(Number(contractId));
      setOtpSent(true);
      Alert.alert(' Đã gửi OTP', 'Kiểm tra email để lấy mã OTP ký hợp đồng (hiệu lực 10 phút)');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Gửi OTP thất bại!');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSign = async () => {
    if (otp.length !== 6) { Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 số OTP!'); return; }
    try {
      setSigning(true);
      const res = await signContractAPI(Number(contractId), otp);
      Alert.alert('Ký thành công!', res.message);
      setOtp('');
      setOtpSent(false);
      fetchContract();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Ký hợp đồng thất bại!');
    } finally {
      setSigning(false);
    }
  };

  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  const handlePay = async () => {
    try {
      setPaying(true);
      const res = await createPaymentUrlAPI(Number(contractId));
      const url = res.data?.paymentUrl;
      if (url) {
      setPaymentUrl(url);
      setShowPaymentWebView(true);
    }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Tạo link thanh toán thất bại!');
    } finally {
      setPaying(false);
    }
  };

  const handlePaymentNavStateChange = (navState: { url: string }) => {
  if (navState.url.includes('/contract/vnpay-return')) {
    setShowPaymentWebView(false);

    const queryString = navState.url.split('?')[1] || '';
    const query: Record<string, string> = {};
    queryString.split('&').forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });

    const responseCode = query['vnp_ResponseCode'];

    if (responseCode === '00') {
      Alert.alert('Thành công', 'Thanh toán tiền cọc thành công!');
    } else {
      Alert.alert('Thất bại', 'Thanh toán không thành công hoặc đã bị hủy.');
    }

    fetchContract(); // load lại trạng thái hợp đồng (deposit_paid, status...)
  }
};

  const handleCancel = () => {
  setShowCancelModal(true); // Hiển thị Modal để người dùng nhập lý do
};

const proceedCancel = async () => {
  if (!reason.trim()) {
    Alert.alert('Lỗi', 'Vui lòng nhập lý do hủy hợp đồng!');
    return;
  }

  try {
    await cancelContractAPI(Number(contractId), reason);
    Alert.alert('Thành công', 'Hợp đồng đã được hủy!');
    setShowCancelModal(false);
    router.replace('/');
  } catch (err: any) {
    Alert.alert('Lỗi', err?.response?.data?.message || 'Hủy thất bại!');
  }
};

  const formatPrice = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} triệu VNĐ` : `${n.toLocaleString()} VNĐ`;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

  if (loading) return (
    <View style={styles.loadingBox}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );

  if (!contract) return null;

  const status = STATUS_MAP[contract.status] ?? STATUS_MAP.draft;
  const ownerSigned = contract.signatures?.some((s: any) => s.user_id === contract.room?.owner_id);
  const tenantSigned = contract.signatures?.some((s: any) => s.user_id === contract.tenant_id);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hợp đồng {contract.contract_id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {contract.status === 'cancel' && (
    <View style={styles.cancelledBanner}>
      <Ionicons name="alert-circle-outline" size={20} color="#B91C1C" />
      <Text style={styles.cancelledText}>Hợp đồng này đã bị hủy.</Text>
    </View>
  )}

        {/* Status */}
        <View style={styles.section}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>

          {/* Progress steps */}
          <View style={styles.steps}>
            {[
              { label: 'Tạo HĐ', done: true },
              { label: 'Tenant xác nhận', done: contract.tenant_confirmed },
              { label: 'Ký kết', done: ownerSigned && tenantSigned },
              { label: 'Thanh toán cọc', done: contract.deposit_paid },
              { label: 'Hiệu lực', done: contract.status === 'active' },
            ].map((step, i, arr) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepDot, step.done && styles.stepDotDone]}>
                  {step.done && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                {i < arr.length - 1 && (
                  <View style={[styles.stepLine, step.done && styles.stepLineDone]} />
                )}
                <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Thông tin các bên */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Các bên tham gia</Text>

          {/* Chủ phòng */}
          <View style={styles.partyCard}>
            <View style={styles.partyHeader}>
              <Text style={styles.partyRole}>🏠 Bên A - Chủ phòng</Text>
              {ownerSigned && (
                <View style={styles.signedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.signedText}>Đã ký</Text>
                </View>
              )}
            </View>
            <View style={styles.partyInfo}>
              <View style={styles.partyAvatar}>
                {contract.room?.owner?.avatar_url ? (
                  <Image source={{ uri: contract.room.owner.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>
                    {contract.room?.owner?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                )}
              </View>
              <View>
                <Text style={styles.partyName}>{contract.room?.owner?.full_name}</Text>
                <Text style={styles.partyContact}>{contract.room?.owner?.phone}</Text>
              </View>
            </View>
          </View>

          {/* Người thuê */}
          <View style={[styles.partyCard, { marginTop: 10 }]}>
            <View style={styles.partyHeader}>
              <Text style={styles.partyRole}>👤 Bên B - Người thuê</Text>
              {tenantSigned && (
                <View style={styles.signedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.signedText}>Đã ký</Text>
                </View>
              )}
            </View>
            <View style={styles.partyInfo}>
              <View style={styles.partyAvatar}>
                {contract.tenant?.avatar_url ? (
                  <Image source={{ uri: contract.tenant.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>
                    {contract.tenant?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                )}
              </View>
              <View>
                <Text style={styles.partyName}>{contract.tenant?.full_name}</Text>
                <Text style={styles.partyContact}>{contract.tenant?.phone}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Chi tiết hợp đồng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiết hợp đồng</Text>
          <View style={styles.detailCard}>
            {[
              { label: 'Địa chỉ phòng', value: `${contract.room?.address?.detail}, ${contract.room?.address?.ward?.ward_name}` },
              { label: 'Giá thuê/tháng', value: formatPrice(Number(contract.monthly_rent)) },
              { label: 'Tiền cọc', value: formatPrice(Number(contract.deposit_amount)) },
              { label: 'Ngày bắt đầu', value: formatDate(contract.start_date) },
              { label: 'Ngày kết thúc', value: contract.end_date ? formatDate(contract.end_date) : 'Không xác định' },
              { label: 'Đóng tiền hàng tháng', value: `Ngày ${contract.payment_due_day}` },
            ].map((item, i) => (
              <View key={i} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
        {/* Điều khoản phụ */}
{contract.draft_data?.notes ? (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Điều khoản bổ sung</Text>
    <View style={styles.notesBox}>
      <Text style={styles.notesText}>
        {contract.draft_data.notes}
      </Text>
    </View>
  </View>
) : null}

        

        {/* ── ACTION BUTTONS ─────────────────────────────────── */}

        {/* Tenant confirm */}
        {canConfirm && (
          <View style={styles.section}>
            <View style={styles.actionBox}>
              <Ionicons name="document-text-outline" size={28} color="#F59E0B" />
              <Text style={styles.actionTitle}>Xác nhận hợp đồng</Text>
              <Text style={styles.actionDesc}>
                Chủ phòng đã gửi hợp đồng thuê nhà. Vui lòng đọc kỹ các điều khoản trước khi xác nhận.
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
                onPress={handleConfirm}
                disabled={confirming}
              >
                {confirming
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.actionBtnText}>Xác nhận hợp đồng</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Ký hợp đồng */}
        {canSign && (
          <View style={styles.section}>
            <View style={styles.actionBox}>
              <Ionicons name="pencil" size={28} color="#4F46E5" />
              <Text style={styles.actionTitle}>Ký hợp đồng</Text>
              <Text style={styles.actionDesc}>
                {hasSigned
                  ? 'Bạn đã ký. Đang chờ bên kia ký!'
                  : 'Nhấn nút bên dưới để nhận OTP qua email và tiến hành ký hợp đồng.'}
              </Text>

              {!otpSent ? (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#4F46E5' }]}
                  onPress={handleRequestOTP}
                  disabled={sendingOtp}
                >
                  {sendingOtp
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.actionBtnText}> Nhận OTP để ký</Text>}
                </TouchableOpacity>
              ) : (
                <View style={styles.otpBox}>
                  <Text style={styles.otpLabel}>Nhập mã OTP từ email:</Text>
                  <TextInput
                    style={styles.otpInput}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="000000"
                    textAlign="center"
                  />
                  <View style={styles.otpActions}>
                    <TouchableOpacity
                      style={styles.otpResendBtn}
                      onPress={() => { setOtpSent(false); setOtp(''); }}
                    >
                      <Text style={styles.otpResendText}>Gửi lại</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: '#4F46E5' }]}
                      onPress={handleSign}
                      disabled={signing || otp.length !== 6}
                    >
                      {signing
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.actionBtnText}>Ký hợp đồng</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Thanh toán cọc */}
        {canPay && (
          <View style={styles.section}>
            <View style={styles.actionBox}>
              <Ionicons name="card-outline" size={28} color="#8B5CF6" />
              <Text style={styles.actionTitle}>Thanh toán tiền cọc</Text>
              <Text style={styles.actionDesc}>
                Hợp đồng đã được ký kết. Vui lòng thanh toán tiền cọc{' '}
                <Text style={{ fontWeight: '700', color: '#8B5CF6' }}>
                  {formatPrice(Number(contract.deposit_amount))}
                </Text>{' '}
                qua VNPay để hợp đồng có hiệu lực.
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                onPress={handlePay}
                disabled={paying}
              >
                {paying
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.actionBtnText}>💳 Thanh toán qua VNPay</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Hủy hợp đồng */}
        { contract.status !== 'cancel' && (
          <View style={[styles.section, { paddingBottom: 32 }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={styles.cancelBtnText}>Hủy hợp đồng</Text>
            </TouchableOpacity>
          </View>
        )}
        <Modal visible={showCancelModal} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Lý do hủy hợp đồng</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Nhập lý do của bạn..."
        value={reason}
        onChangeText={setReason}
        multiline
      />
      <View style={styles.modalActions}>
        <TouchableOpacity style={styles.btnCancel} onPress={() => setShowCancelModal(false)}>
          <Text>Đóng</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnConfirm} onPress={proceedCancel}>
          <Text style={{color: 'white'}}>Xác nhận hủy</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

        <View style={{ height: 32 }} />
        <Modal visible={showPaymentWebView} animationType="slide">
  <SafeAreaView style={{ flex: 1 }}>
    <View style={styles.webviewHeader}>
      <TouchableOpacity onPress={() => setShowPaymentWebView(false)}>
        <Ionicons name="close" size={26} color="#111" />
      </TouchableOpacity>
      <Text style={styles.webviewTitle}>Thanh toán VNPay</Text>
      <View style={{ width: 26 }} />
    </View>
    <WebView
      source={{ uri: paymentUrl }}
      onNavigationStateChange={handlePaymentNavStateChange}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      )}
    />
  </SafeAreaView>
</Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? 48 : 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 14 },

  // Status
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, marginBottom: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },

  // Steps
  steps: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { flex: 1, alignItems: 'center' },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center',
  },
  stepDotDone: { backgroundColor: '#10B981' },
  stepLine: { position: 'absolute', top: 11, left: '50%', width: '100%', height: 2, backgroundColor: '#E5E7EB' },
  stepLineDone: { backgroundColor: '#10B981' },
  stepLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
  stepLabelDone: { color: '#10B981', fontWeight: '600' },

  // Thêm vào StyleSheet
notesBox: {
  backgroundColor: '#F9FAFB',
  padding: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#E5E7EB',
},
notesText: {
  fontSize: 14,
  color: '#374151',
  lineHeight: 20, // Giúp các dòng chữ cách nhau hợp lý
},
  // Party
  partyCard: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12,
  },
  partyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  partyRole: { fontSize: 13, fontWeight: '600', color: '#374151' },
  signedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signedText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  partyInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  partyAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  partyName: { fontSize: 14, fontWeight: '600', color: '#111' },
  partyContact: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Detail
  detailCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  detailLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111', flex: 1.5, textAlign: 'right' },

  // PDF
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: 14, justifyContent: 'center',
  },
  pdfBtnText: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },

  // Action box
  actionBox: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 10,
  },
  actionTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  actionDesc: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, padding: 14, width: '100%',
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // OTP
  otpBox: { width: '100%', gap: 10 },
  otpLabel: { fontSize: 13, color: '#374151', fontWeight: '600', textAlign: 'center' },
  otpInput: {
    borderWidth: 2, borderColor: '#4F46E5', borderRadius: 12,
    padding: 14, fontSize: 24, fontWeight: '800', color: '#111',
    letterSpacing: 8, backgroundColor: '#EEF2FF',
  },
  otpActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  otpResendBtn: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, alignItems: 'center', paddingHorizontal: 16,
  },
  otpResendText: { fontSize: 13, color: '#6B7280' },

  // Cancel
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#FEE2E2', borderRadius: 12,
    padding: 14, backgroundColor: '#FEF2F2',
  },
  cancelBtnText: { fontSize: 14, color: '#EF4444', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12 },
modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, height: 100, marginBottom: 20 },
modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
btnCancel: { padding: 10 },
btnConfirm: { padding: 10, backgroundColor: '#EF4444', borderRadius: 8 },
cancelledBanner: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelledText: {
    fontSize: 14,
    color: '#B91C1C',
    fontWeight: '600',
  },
  webviewHeader: {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  paddingHorizontal: 16, paddingVertical: 12,
  borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
},
webviewTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
});