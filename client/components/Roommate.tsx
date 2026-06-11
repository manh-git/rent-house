import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateRoommateAPI, deleteRoommateAPI } from '@/store/roommate.service';
import { Picker } from '@react-native-picker/picker';
import { getFindRoom } from '@/store/chat.service';
import { useRouter } from 'expo-router';
// Copy các helper này
const AVATAR_COLORS = [{ bg: '#EEEDFE', text: '#3C3489' }, { bg: '#E1F5EE', text: '#085041' }, { bg: '#FAEEDA', text: '#633806' }, { bg: '#FAECE7', text: '#4A1B0C' }, { bg: '#E6F1FB', text: '#0C447C' }];
const getAvatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
const getInitials = (name: string) => name?.trim().charAt(0).toUpperCase() ?? '?';
const formatBudget = (val: any) => val ? Number(val).toLocaleString('vi-VN') + ' đ' : '—';
const STATUS_CONFIG: Record<string, any> = { Pending: { label: 'Đang tìm', color: '#1D9E75' }, Negotiating: { label: 'Đang thương lượng', color: '#BA7517' }, Closed: { label: 'Đã đóng', color: '#888780' } };

function Tag({
  icon,
  label,
  variant = 'default',
}: {
  icon: any;
  label: string;
  variant?: 'default' | 'budget' | 'gender';
}) {
  const variantStyle = {
    default: { bg: '#F1EFE8', text: '#5F5E5A', border: '#D3D1C7' },
    budget:  { bg: '#E1F5EE', text: '#085041', border: '#9FE1CB' },
    gender:  { bg: '#EEEDFE', text: '#3C3489', border: '#CECBF6' },
  }[variant];

  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: variantStyle.bg, borderColor: variantStyle.border },
      ]}
    >
      <Ionicons name={icon} size={12} color={variantStyle.text} />
      <Text style={[styles.tagText, { color: variantStyle.text }]}>{label}</Text>
    </View>
  );
}

function RoommateCard({
  item,
  currentUserId,
  isEditable,
  isAdmin,
  onEdit,
  onDelete,
  onChat,
}: {
  item: any;
  currentUserId: number;
  isEditable: boolean;
  isAdmin: boolean
  onEdit: () => void;
  onDelete: () => void;
  onChat: () => void;
}) {
  const isOwner = item.sender_id === currentUserId && isEditable;
  const name = item.sender?.full_name ?? 'Người dùng';
  const avatarColor = getAvatarColor(name);
  const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.Pending;
  const genderIcon = item.preferred_gender === 'Nữ' ? 'female' : 'male';
  const canDelete = isOwner || isAdmin;
 
  const formatTime = (dateStr: string) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
};

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
          <Text style={[styles.avatarText, { color: avatarColor.text }]}>
            {getInitials(name)}
          </Text>
        </View>
        <View style={styles.senderInfo}>
          <Text style={styles.senderName} numberOfLines={1}>{name}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={11} color="#888780" />
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
        {(!isOwner && !isAdmin) && (
          <TouchableOpacity style={styles.chatBtnSm} onPress={onChat} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={14} color="#534AB7" />
            <Text style={styles.chatBtnSmText}>Nhắn tin</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Title */}
      <Text style={styles.cardTitle}>{item.title}</Text>

      {/* Tags */}
      <View style={styles.tags}>
        {item.preferred_gender && (
          <Tag icon={`${genderIcon}-outline`} label={item.preferred_gender} variant="gender" />
        )}
        {(item.min_age || item.max_age) && (
          <Tag
            icon="people-outline"
            label={`${item.min_age ?? '?'} – ${item.max_age ?? '?'} tuổi`}
          />
        )}
        {item.budget && (
          <Tag icon="wallet-outline" label={formatBudget(item.budget)} variant="budget" />
        )}
        {item.ward?.ward_name && (
          <Tag icon="location-outline" label={item.ward.ward_name} />
        )}
        {item.habits && (
          <Tag icon="leaf-outline" label={item.habits} />
        )}
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        {(isOwner|| isAdmin) && (
          <View style={styles.ownerActions}>
            {((isOwner)&&<TouchableOpacity style={styles.btnEdit} onPress={onEdit} activeOpacity={0.7}>
              <Ionicons name="pencil-outline" size={13} color="#444441" />
              <Text style={styles.btnEditText}>Sửa</Text>
            </TouchableOpacity>)}
            <TouchableOpacity style={styles.btnDel} onPress={onDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={13} color="#A32D2D" />
              <Text style={styles.btnDelText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
export const RoommateList = ({ data, loading, currentUserId, onRefresh, wards, isEditable = true, isAdmin= false, onDeleteAction }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [habits, setHabits] = useState('');
  const [budget, setBudget] = useState('');
  const [preferred_gender, setPreferredGender] = useState('Nam');
  const [ward_id, setWardId] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [status, setStatus] = useState('Pending');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const router = useRouter();

  const openModal = (item: any = null) => {
    setIsEditing(!!item);
    setSelectedItem(item);
    setTitle(item?.title ?? '');
    setHabits(item?.habits ?? '');
    setPreferredGender(item?.preferred_gender ?? 'Nam');
    setBudget(item?.budget ? String(Number(item.budget)) : '');
    setWardId(item?.ward_id ? String(item.ward_id) : '');
    setMinAge(item?.min_age ? String(item.min_age) : '');
    setMaxAge(item?.max_age ? String(item.max_age) : '');
    setStatus(item?.status ?? 'Pending');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const payload = { title, habits, preferred_gender, budget: Number(budget), ward_id: Number(ward_id), min_age: Number(minAge), max_age: Number(maxAge), status };
    try {
      if (isEditing) await updateRoommateAPI({ ...payload, roommate_id: selectedItem.request_id });
      setModalVisible(false);
      onRefresh?.();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật');
    }
  };

 const handleDelete = (id: number) => {
  if(!isAdmin){
  const performDelete = async () => {
    try {
      await deleteRoommateAPI(id);
      onRefresh?.();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể xóa bài đăng');
    }
  };

  if (Platform.OS === 'web') {
    const confirmed = window.confirm('Bạn chắc chắn muốn xóa?');
    if (confirmed) {
      performDelete();
    }
  } else {
    Alert.alert('Xác nhận', 'Bạn chắc chắn muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      { 
        text: 'Xóa', 
        style: 'destructive', 
        onPress: () => performDelete() 
      }
    ]);
  }}
  else{
    setSelectedItem(id);
    setDeleteModalVisible(true);
  }
};
  const confirmAdminDelete = async () => {
    if (!deleteReason.trim()) return Alert.alert('Thông báo', 'Vui lòng nhập lý do xóa');
    try {
      await onDeleteAction(selectedItem.request_id, deleteReason);
      setDeleteModalVisible(false);
      setDeleteReason('');
      onRefresh?.();
    } catch {
      Alert.alert('Lỗi', 'Không thể thực hiện xóa');
    }
  };


  const handleStartChat = async (ownerId: number, ownerName: string, ownerAvatar: string) => {
    try {
      const res = await getFindRoom(ownerId);
      const existingConvId = res.data;
      router.push({
        pathname: `/message/${existingConvId ?? 'new'}`,
        params: {
          id: existingConvId ? String(existingConvId) : '',
          receiverId: String(ownerId),
          receiverName: ownerName,
          receiverAvatar: ownerAvatar ?? '',
        },
      });
    } catch {
      Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ chat.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.request_id.toString()}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24, gap: 16, padding: 10 }}
        renderItem={({ item }) => (
          <RoommateCard 
            item={item} 
            isEditable= {isEditable}
            isAdmin={isAdmin}
            currentUserId={currentUserId} 
            onEdit={() => isEditable && openModal(item)}
            onDelete={() => handleDelete(item)}
            onChat={() => handleStartChat(
                item.sender_id, 
                item.sender?.full_name ?? 'Người dùng', 
                item.sender?.avatar_url ?? ''
            )}
          />
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Không có dữ liệu</Text>}
      />


      
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Lý do xóa bài (Admin)</Text>
            <TextInput style={styles.input} value={deleteReason} onChangeText={setDeleteReason} placeholder="Nhập lý do..." />
            <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setDeleteModalVisible(false)}><Text>Hủy</Text></TouchableOpacity>
                <TouchableOpacity style={styles.btnSubmit} onPress={confirmAdminDelete}><Text style={{color:'#fff'}}>Xác nhận xóa</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Chỉnh sửa' : 'Đăng bài'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={22} /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text>Tiêu đề</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} />
              <Text>Yêu cầu</Text>
              <TextInput style={styles.input} value={habits} onChangeText={setHabits} />
              <Text style={styles.fieldLabel}> Yêu cầu *</Text>
                            <TextInput
                              style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
                              placeholder="VD: Ngăn nắp, không hút thuốc, ít về muộn"
                              placeholderTextColor="#B4B2A9"
                              value={habits}
                              onChangeText={setHabits}
                              multiline
                            />
                            <Text style={styles.fieldLabel}>Ngân sách (VNĐ/tháng)</Text>
                                          <TextInput
                                            style={styles.input}
                                            placeholder="VD: 3500000"
                                            placeholderTextColor="#B4B2A9"
                                            value={budget}
                                            onChangeText={setBudget}
                                            keyboardType="numeric"
                                          />
                <Text style={styles.fieldLabel}>Tuổi tối thiểu</Text>
                                  <TextInput
                                    style={styles.input}
                                    placeholder="18"
                                    placeholderTextColor="#B4B2A9"
                                    value={minAge}
                                    onChangeText={setMinAge}
                                    keyboardType="numeric"
                                  />
                                  <Text style={styles.fieldLabel}>Tuổi tối đa</Text>
                                                    <TextInput
                                                      style={styles.input}
                                                      placeholder="35"
                                                      placeholderTextColor="#B4B2A9"
                                                      value={maxAge}
                                                      onChangeText={setMaxAge}
                                                      keyboardType="numeric"
                                                    />
                    <Text style={styles.fieldLabel}>Giới tính ưu tiên</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={preferred_gender}
                  onValueChange={setPreferredGender}
                  style={styles.picker}
                >
                  <Picker.Item label="Nam" value="Nam" />
                  <Picker.Item label="Nữ" value="Nữ" />
                  <Picker.Item label="Không yêu cầu" value="Khác" />
                </Picker>
              </View>
              <Text style={styles.fieldLabel}>Khu vực</Text>
                            <View style={styles.pickerWrap}>
                              <Picker selectedValue={ward_id} onValueChange={setWardId} style={styles.picker}>
                                <Picker.Item label="Chọn phường / xã" value="" />
                                {wards.map((w: any) => (
                                  <Picker.Item key={w.ward_id} label={w.ward_name} value={String(w.ward_id)} />
                                ))}
                              </Picker>
                            </View>
              <Text style={styles.fieldLabel}>Trạng thái</Text>
                                <View style={styles.pickerWrap}>
                                  <Picker selectedValue={status} onValueChange={setStatus} style={styles.picker}>
                                    <Picker.Item label="Đang tìm" value="Pending" />
                                    <Picker.Item label="Đang thương lượng" value="Negotiating" />
                                    <Picker.Item label="Đã đóng" value="Closed" />
                                  </Picker>
                                </View>
              
              <TouchableOpacity style={styles.btnSubmit} onPress={handleSave}>
                <Text style={{color: '#fff'}}>Lưu thay đổi</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};
const styles = StyleSheet.create({

  
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#CECBF6',
    backgroundColor: '#EEEDFE',
  },
  addBtnText: { fontSize: 13, color: '#3C3489', fontWeight: '500' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 14, paddingBottom: 24, paddingTop: 4 },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#D3D1C7',
    padding: 14,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: '500' },
  senderInfo: { flex: 1, minWidth: 0 },
  senderName: { fontSize: 14, fontWeight: '500', color: '#2C2C2A' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  timeText: { fontSize: 11, color: '#888780' },

  chatBtnSm: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 0.5,
    borderColor: '#D3D1C7', backgroundColor: '#F1EFE8',
    flexShrink: 0,
  },
  chatBtnSmText: { fontSize: 12, color: '#3C3489', fontWeight: '500' },

  cardTitle: { fontSize: 15, fontWeight: '500', color: '#2C2C2A', lineHeight: 22 },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 8, borderWidth: 0.5,
  },
  tagText: { fontSize: 12 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#E8E6DF',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '500' },

  ownerActions: { flexDirection: 'row', gap: 6 },
  btnEdit: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 8, borderWidth: 0.5,
    borderColor: '#D3D1C7', backgroundColor: '#F1EFE8',
  },
  btnEditText: { fontSize: 12, color: '#444441', fontWeight: '500' },
  btnDel: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 8, borderWidth: 0.5,
    borderColor: '#F7C1C1', backgroundColor: '#FCEBEB',
  },
  btnDelText: { fontSize: 12, color: '#A32D2D', fontWeight: '500' },

  // ── Empty ─────────────────────────────────────────────────────────────────
  emptyBox: { alignItems: 'center', paddingTop: 72, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '500', color: '#5F5E5A' },
  emptySubText: { fontSize: 13, color: '#B4B2A9' },

  // ── Modal ────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#D3D1C7',
    alignSelf: 'center', marginTop: 10, marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#E8E6DF',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#2C2C2A' },

  fieldLabel: { fontSize: 12, color: '#888780', marginBottom: 6, marginTop: 4, fontWeight: '500' },
  input: {
    borderWidth: 0.5, borderColor: '#D3D1C7', borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 10,
    fontSize: 14, color: '#2C2C2A',
    backgroundColor: '#FAFAF8', marginBottom: 12,
  },
  row: { flexDirection: 'row' },
  pickerWrap: {
    borderWidth: 0.5, borderColor: '#D3D1C7', borderRadius: 10,
    backgroundColor: '#FAFAF8', marginBottom: 12, overflow: 'hidden',
  },
  picker: { height: 48, color: '#2C2C2A' },

  modalActions: {
    flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 8,
  },
  btnCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 0.5, borderColor: '#D3D1C7', backgroundColor: '#F1EFE8',
    alignItems: 'center',
  },
  btnCancelText: { fontSize: 14, color: '#5F5E5A', fontWeight: '500' },
  btnSubmit: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#534AB7', alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center',
  },
  btnSubmitText: { fontSize: 14, color: '#fff', fontWeight: '500' },
});