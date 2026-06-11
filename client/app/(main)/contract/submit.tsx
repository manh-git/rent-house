import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { submitAPI, getWithdrawalRequestAPI, updateWithdrawalRequestAPI } from '@/store/contract.service';

const BANKS = [
  'Vietcombank', 'Techcombank', 'BIDV', 'VietinBank',
  'Agribank', 'MBBank', 'TPBank', 'VPBank', 'ACB', 'SHB',
];

export default function WithdrawScreen() {
  const router = useRouter();
  const { contractId } = useLocalSearchParams<{ contractId: string }>();

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [showBankList, setShowBankList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null);
  // Cấu hình Modal
  const [modal, setModal] = useState<{
    visible: boolean; title: string; message: string; 
    onConfirm?: () => void; showCancel?: boolean;
  }>({ visible: false, title: '', message: '' });

  useEffect(() => {
  const loadExistingData = async () => {
    const existing = await getWithdrawalRequestAPI(Number(contractId));
    if (existing) {
      setBankName(existing.data.bank_name);
      setAccountNumber(existing.data.account_number);
      setAccountHolder(existing.data.account_holder);
      setRequestId(existing.data.withdrawal_id
);
    }
  };
  loadExistingData();
}, [contractId]);
  const handleSubmit = async () => {
    if (!bankName.trim()) { setModal({ visible: true, title: 'Lỗi', message: 'Vui lòng chọn ngân hàng!' }); return; }
    if (!accountNumber.trim()) { setModal({ visible: true, title: 'Lỗi', message: 'Vui lòng nhập số tài khoản!' }); return; }
    if (!accountHolder.trim()) { setModal({ visible: true, title: 'Lỗi', message: 'Vui lòng nhập tên chủ tài khoản!' }); return; }

    setModal({
    visible: true,
    title: requestId ? 'Cập nhật thông tin' : 'Xác nhận thông tin',
    message: requestId 
      ? 'Bạn muốn thay đổi thông tin tài khoản nhận tiền?' 
      : 'Bạn có chắc chắn muốn gửi yêu cầu giải ngân?',
    showCancel: true,
    onConfirm: async () => {
      try {
        setLoading(true);
        const payload = {
          contract_id: Number(contractId),
          bank_name: bankName,
          account_number: accountNumber,
          account_holder: accountHolder.toUpperCase(),
        };

        if (requestId) {
          await updateWithdrawalRequestAPI(requestId, payload);
        } else {
          await submitAPI(payload);
        }
        
        setModal({ 
          visible: true, 
          title: 'Thành công!', 
          message: requestId ? 'Đã cập nhật thông tin thành công.' : 'Yêu cầu đã được gửi.',
          onConfirm: () => router.replace('/') 
        });
      } catch (err: any) {
        setModal({ visible: true, title: 'Lỗi', message: 'Thao tác thất bại!' });
      } finally {
        setLoading(false);
      }
    }
  });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Modal visible={modal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modal.title}</Text>
            <Text style={styles.modalMessage}>{modal.message}</Text>
            <View style={styles.modalActions}>
              {modal.showCancel && (
                <TouchableOpacity style={styles.modalCancel} onPress={() => setModal(prev => ({...prev, visible: false}))}>
                  <Text style={{fontWeight: '600'}}>Kiểm tra lại</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.modalConfirm} onPress={() => { modal.onConfirm?.(); setModal(prev => ({...prev, visible: false})); }}>
                <Text style={{color: '#fff', fontWeight: '600'}}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#111" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Nhận tiền cọc</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <Ionicons name="checkmark-circle" size={40} color="#10B981" />
          <Text style={styles.bannerTitle}>Đủ điều kiện giải ngân!</Text>
          <Text style={styles.bannerDesc}>Hợp đồng #{contractId}. Vui lòng nhập thông tin ngân hàng.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Ngân hàng <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.bankSelector} onPress={() => setShowBankList(!showBankList)}>
            <Text style={styles.bankSelectorText}>{bankName || 'Chọn ngân hàng...'}</Text>
            <Ionicons name={showBankList ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
          </TouchableOpacity>
          {showBankList && (
            <View style={styles.bankList}>
              {BANKS.map(bank => (
                <TouchableOpacity key={bank} style={styles.bankItem} onPress={() => { setBankName(bank); setShowBankList(false); }}>
                  <Text style={styles.bankItemText}>{bank}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Số tài khoản <Text style={styles.required}>*</Text></Text>
          <TextInput style={styles.input} value={accountNumber} onChangeText={setAccountNumber} placeholder="Nhập số tài khoản..." keyboardType="number-pad" />

          <Text style={styles.label}>Tên chủ tài khoản <Text style={styles.required}>*</Text></Text>
          <TextInput style={[styles.input, { textTransform: 'uppercase' }]} value={accountHolder} onChangeText={t => setAccountHolder(t.toUpperCase())} placeholder="NGUYEN VAN A" />
        </View>

        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Gửi yêu cầu nhận tiền</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { flex: 1 },
  banner: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#10B981' },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#10B981' },
  bannerDesc: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  required: { color: '#EF4444' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 15 },
  bankSelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12 },
  bankSelectorText: { flex: 1, fontSize: 15 },
  bankList: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginTop: 4, padding: 5 },
  bankItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  bankItemText: { fontSize: 14, color: '#374151' },
  submitBtn: { backgroundColor: '#10B981', borderRadius: 14, padding: 16, margin: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 16, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalMessage: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 10 },
  modalCancel: { padding: 10 },
  modalConfirm: { backgroundColor: '#10B981', padding: 10, borderRadius: 8, paddingHorizontal: 20 }
});