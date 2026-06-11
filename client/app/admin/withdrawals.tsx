import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getWithdrawalsAPI, updateWithdrawalAPI } from '@/store/admin.service';

interface Withdrawal {
  withdrawal_id: number;
  owner_id: number;
  contract_id: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  amount: number;
  status: string;
  contract?: any;
}

export default function AdminWithdrawalsScreen() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await getWithdrawalsAPI();
      setWithdrawals(res.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = (item: Withdrawal) => {
    Alert.alert(
      'Xác nhận chuyển tiền',
      `Chuyển ${Number(item.amount).toLocaleString('vi-VN')} VNĐ đến:\n${item.bank_name}\nSố TK: ${item.account_number}\nChủ TK: ${item.account_holder}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đã chuyển tiền', onPress: async () => {
            try {
              await updateWithdrawalAPI(item.withdrawal_id, 'completed');
              Alert.alert('✅ Thành công', 'Đã xác nhận chuyển tiền!');
              fetchData();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Thất bại!');
            }
          }
        },
      ]
    );
  };

  const handleReject = (item: Withdrawal) => {
    Alert.alert('Từ chối yêu cầu', 'Xác nhận từ chối yêu cầu rút tiền này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Từ chối', style: 'destructive', onPress: async () => {
          try {
            await updateWithdrawalAPI(item.withdrawal_id, 'rejected');
            fetchData();
          } catch (err: any) {
            Alert.alert('Lỗi', err?.response?.data?.message || 'Thất bại!');
          }
        }
      },
    ]);
  };

  const renderItem = ({ item }: { item: Withdrawal }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardId}>Hợp đồng #{item.contract_id}</Text>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>Chờ xử lý</Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Số tiền cần chuyển</Text>
        <Text style={styles.amount}>{Number(item.amount).toLocaleString('vi-VN')} VNĐ</Text>
      </View>

      <View style={styles.bankInfo}>
        <View style={styles.bankRow}>
          <Ionicons name="business-outline" size={14} color="#6B7280" />
          <Text style={styles.bankText}>{item.bank_name}</Text>
        </View>
        <View style={styles.bankRow}>
          <Ionicons name="card-outline" size={14} color="#6B7280" />
          <Text style={styles.bankText}>{item.account_number}</Text>
        </View>
        <View style={styles.bankRow}>
          <Ionicons name="person-outline" size={14} color="#6B7280" />
          <Text style={styles.bankText}>{item.account_holder}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}>
          <Text style={styles.rejectBtnText}>Từ chối</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
          <Ionicons name="checkmark-outline" size={16} color="#fff" />
          <Text style={styles.approveBtnText}>Đã chuyển tiền</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yêu cầu rút tiền</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#4F46E5" />
      ) : (
        <FlatList
          data={withdrawals}
          keyExtractor={item => item.withdrawal_id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-circle-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không có yêu cầu nào đang chờ</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? 48 : 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardId: { fontSize: 14, fontWeight: '700', color: '#111' },
  pendingBadge: { backgroundColor: '#FFFBEB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pendingText: { fontSize: 11, color: '#F59E0B', fontWeight: '700' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  amountLabel: { fontSize: 13, color: '#6B7280' },
  amount: { fontSize: 18, fontWeight: '800', color: '#4F46E5' },
  bankInfo: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, gap: 6, marginBottom: 14 },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bankText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#FEE2E2',
    borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#FEF2F2',
  },
  rejectBtnText: { fontSize: 14, color: '#EF4444', fontWeight: '600' },
  approveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#10B981', borderRadius: 10, padding: 12,
  },
  approveBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});