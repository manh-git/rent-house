import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform, ActivityIndicator,
  Alert, RefreshControl, Modal, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { searchUsersAPI, lockUserAPI, unlockUserAPI, updateRoleAPI } from '@/store/admin.service';
import { useAuth } from '@/store/authStore';

const ROLE_LABELS: Record<number, string> = {
  1: 'Người thuê', 2: 'Chủ phòng', 3: 'Admin', 5: 'Super Admin',
};

interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  role_id: number;
  created_at: string;
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchKey, setSearchKey] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'lock' | 'role' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [reason, setReason] = useState('');

  const fetchUsers = useCallback(async (key = '', pageNum = 0, reset = false) => {
    try {
      setLoading(true);
      const res = await searchUsersAPI(key, pageNum, 15);
      const data = res.data ?? [];
      setUsers(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === 15);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { fetchUsers('', 0, true); }, []);

  const handleSearch = (text: string) => {
    setSearchKey(text);
    fetchUsers(text, 0, true);
  };

  const openLockModal = (user: User) => {
    setSelectedUser(user);
    setModalType('lock');
    setModalVisible(true);
  };

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setModalType('role');
    setModalVisible(true);
  };

  const executeLockAction = async () => {
    if (!selectedUser || !reason) return;
    try {
      if (selectedUser.is_active) await lockUserAPI(selectedUser.user_id, reason);
      else await unlockUserAPI(selectedUser.user_id, reason);
      fetchUsers(searchKey, 0, true);
      setModalVisible(false);
      setReason('');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Thất bại!');
    }
  };

  const executeUpdateRole = async (roleId: number) => {
    if (!selectedUser) return;
    try {
      await updateRoleAPI(selectedUser.user_id, roleId);
      fetchUsers(searchKey, 0, true);
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Thất bại!');
    }
  };

  const renderActionModal = () => (
    <Modal visible={modalVisible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
        <TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'lock' ? (selectedUser?.is_active ? 'Khóa tài khoản' : 'Mở tài khoản') : 'Thay đổi quyền'}
            </Text>
            {modalType === 'lock' ? (
              <>
                <TextInput 
                  style={styles.input} placeholder="Nhập lý do..." value={reason} 
                  onChangeText={setReason} multiline numberOfLines={3}
                />
                <TouchableOpacity style={styles.confirmBtn} onPress={executeLockAction}>
                  <Text style={styles.btnText}>Xác nhận</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {[1, 2, 3].map((roleId) => (
                  <TouchableOpacity key={roleId} style={styles.roleBtn} onPress={() => executeUpdateRole(roleId)}>
                    <Text style={styles.roleBtnText}>{ROLE_LABELS[roleId]}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{item.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.full_name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.userMeta}>
          <View style={[styles.roleBadge, { backgroundColor: item.is_active ? '#ECFDF5' : '#FEF2F2' }]}>
            <Text style={[styles.roleText, { color: item.is_active ? '#10B981' : '#EF4444' }]}>
              {item.is_active ? 'Hoạt động' : 'Đã khóa'}
            </Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[item.role_id] ?? `Role ${item.role_id}`}</Text>
          </View>
        </View>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.is_active ? '#FEF2F2' : '#ECFDF5' }]} onPress={() => openLockModal(item)}>
          <Ionicons name={item.is_active ? 'lock-closed-outline' : 'lock-open-outline'} size={18} color={item.is_active ? '#EF4444' : '#10B981'} />
        </TouchableOpacity>
        {user?.role === 5 && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF7ED' }]} onPress={() => openRoleModal(item)}>
            <Ionicons name="shield-outline" size={18} color="#EA580C" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EEF2FF' }]} onPress={() => router.push(`/profile/${item.user_id}` as any)}>
          <Ionicons name="eye-outline" size={18} color="#4F46E5" />
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
        <Text style={styles.headerTitle}>Quản lý người dùng</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên, email, SĐT..."
          value={searchKey}
          onChangeText={handleSearch}
          placeholderTextColor="#9CA3AF"
        />
      </View>
      <FlatList
        data={users}
        keyExtractor={item => item.user_id.toString()}
        renderItem={renderUser}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(searchKey, 0, true); }} />}
        onEndReached={() => { if (hasMore && !loading) fetchUsers(searchKey, page + 1); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading ? <ActivityIndicator color="#4F46E5" style={{ padding: 16 }} /> : null}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Không tìm thấy người dùng</Text>
          </View>
        ) : null}
      />
      {renderActionModal()}
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
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111', padding: 0 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center',
  },
  userAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: '#111' },
  userEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  userMeta: { flexDirection: 'row', gap: 6, marginTop: 6 },
  roleBadge: {
    backgroundColor: '#F3F4F6', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  roleText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  userActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 15 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  confirmBtn: { backgroundColor: '#4F46E5', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  cancelBtn: { padding: 10, alignItems: 'center' },
  cancelBtnText: { color: '#6B7280' },
  roleBtn: { padding: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', marginBottom: 5 },
  roleBtnText: { fontWeight: '600' },
});