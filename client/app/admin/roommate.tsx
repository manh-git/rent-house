import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Modal, TextInput,
  TouchableWithoutFeedback, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getListRoommateAPI } from '@/store/roommate.service';
import { RoommateList } from '@/components/Roommate';
import { useAuth } from '@/store/authStore';
import { getWardAPI } from '@/store/post.service';
import { admindeleteRoommateAPI } from '@/store/admin.service';
import { useRouter } from 'expo-router';

export default function AdminRoommateScreen() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [wards, setWards] = useState<any[]>([]);
  const { user } = useAuth();

  const fetchWards = async () => {
    try {
      const res = await getWardAPI();
      setWards(res.data ?? []);
    } catch (e) {
      console.error('Lỗi lấy danh sách phường:', e);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getListRoommateAPI({});
      setData(res?.data?.list || []);
    } catch (e) {
      console.error('Lỗi load dữ liệu:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredData = data.filter(item =>
    item.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useEffect(() => { fetchWards(); }, []);

  const handleDelete = async () => {
    if (!reason.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do xóa bài đăng');
      return;
    }
    if (!selectedPost) return;
    try {
      await admindeleteRoommateAPI(selectedPost.request_id, reason);
      Alert.alert('Thành công', 'Đã xóa bài đăng thành công');
      setModalVisible(false);
      setReason('');
      loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể thực hiện thao tác này');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Bài đăng ở ghép</Text>
          
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* ── SEARCH BAR ─────────────────────────────────────────── */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tiêu đề bài đăng..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── DANH SÁCH ──────────────────────────────────────────── */}
      <RoommateList
        data={filteredData}
        loading={loading}
        isAdmin={true}
        onDeleteAction={(id: number, item: any) => {
          setSelectedPost(item);
          setModalVisible(true);
        }}
        currentUserId={user?.id}
        isEditable={false}
        onRefresh={loadData}
        wards={wards}
      />

      {/* ── MODAL XÁC NHẬN XÓA ─────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                {/* Handle */}
                <View style={styles.modalHandle} />

                {/* Icon */}
                <View style={styles.modalIconBox}>
                  <Ionicons name="trash-outline" size={28} color="#EF4444" />
                </View>

                <Text style={styles.modalTitle}>Xóa bài đăng</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedPost?.title
                    ? `"${selectedPost.title}"`
                    : 'Hành động này không thể hoàn tác.'}
                </Text>

                <Text style={styles.inputLabel}>Lý do xóa <Text style={{ color: '#EF4444' }}>*</Text></Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Nhập lý do xóa bài đăng..."
                  placeholderTextColor="#9CA3AF"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => { setModalVisible(false); setReason(''); }}
                  >
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmBtn, !reason.trim() && styles.confirmBtnDisabled]}
                    onPress={handleDelete}
                    disabled={!reason.trim()}
                  >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>Xác nhận xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#4F46E5',
    paddingTop: Platform.OS === 'android' ? 52 : 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
  },
  headerBadgeText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  // ── Search
  searchSection: { padding: 16, paddingBottom: 8, backgroundColor: '#fff' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111', padding: 0 },

  // ── Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', marginBottom: 20,
  },
  modalIconBox: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 6 },
  modalSubtitle: {
    fontSize: 13, color: '#6B7280', textAlign: 'center',
    marginBottom: 20, lineHeight: 18,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8,
  },
  reasonInput: {
    width: '100%', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, padding: 12, fontSize: 14, color: '#111',
    backgroundColor: '#FAFAFA', height: 90, marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  confirmBtn: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    backgroundColor: '#EF4444', borderRadius: 12, padding: 14,
  },
  confirmBtnDisabled: { backgroundColor: '#FCA5A5' },
  confirmBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});