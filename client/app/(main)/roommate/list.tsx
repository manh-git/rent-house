import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image,
  StyleSheet, Modal, TextInput, Alert, ScrollView, Platform, SafeAreaView, KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, router } from 'expo-router';
import {
  getListRoommateAPI,
  createRoommateAPI,
  updateRoommateAPI,
  deleteRoommateAPI,
} from '@/store/roommate.service';
import { Picker } from '@react-native-picker/picker';
import { getWardAPI } from '@/store/post.service';
import { useAuth } from '@/store/authStore';
import { getFindRoom } from '@/store/chat.service';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#FAECE7', text: '#4A1B0C' },
  { bg: '#E6F1FB', text: '#0C447C' },
];

const getAvatarColor = (name: string) =>
  AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

const getInitials = (name: string) =>
  name?.trim().charAt(0).toUpperCase() ?? '?';

const formatBudget = (val: any) =>
  val ? Number(val).toLocaleString('vi-VN') + ' đ' : '—';

const formatTime = (dateStr: string) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Pending:     { label: 'Đang tìm',          color: '#1D9E75' },
  Negotiating: { label: 'Đang thương lượng', color: '#BA7517' },
  Closed:      { label: 'Đã đóng',           color: '#888780' },
};

// ─── MOBILE PICKER FIELD ─────────────────────────────────────────────────────
// Chỉ dùng trên mobile: hiển thị như input, bấm mở modal chọn riêng

type PickerOption = { label: string; value: string };

type MobilePickerFieldProps = {
  selectedValue: string;
  options: PickerOption[];
  placeholder?: string;
  onPress: () => void;
};

function MobilePickerField({ selectedValue, options, placeholder, onPress }: MobilePickerFieldProps) {
  const label = options.find((o) => o.value === selectedValue)?.label ?? placeholder ?? 'Chọn...';
  const isEmpty = !selectedValue;
  return (
    <TouchableOpacity
      style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 14, color: isEmpty ? '#B4B2A9' : '#2C2C2A', flex: 1 }}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={16} color="#888780" />
    </TouchableOpacity>
  );
}

// ─── TAG ─────────────────────────────────────────────────────────────────────

function Tag({
  icon, label, variant = 'default',
}: {
  icon: any; label: string; variant?: 'default' | 'budget' | 'gender';
}) {
  const variantStyle = {
    default: { bg: '#F1EFE8', text: '#5F5E5A', border: '#D3D1C7' },
    budget:  { bg: '#E1F5EE', text: '#085041', border: '#9FE1CB' },
    gender:  { bg: '#EEEDFE', text: '#3C3489', border: '#CECBF6' },
  }[variant];

  return (
    <View style={[styles.tag, { backgroundColor: variantStyle.bg, borderColor: variantStyle.border }]}>
      <Ionicons name={icon} size={12} color={variantStyle.text} />
      <Text style={[styles.tagText, { color: variantStyle.text }]}>{label}</Text>
    </View>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────

function RoommateCard({
  item, currentUserId, onEdit, onDelete, onChat,
}: {
  item: any; currentUserId: number;
  onEdit: () => void; onDelete: () => void; onChat: () => void;
}) {
  const isOwner = item.sender_id === currentUserId;
  const name = item.sender?.full_name ?? 'Người dùng';
  const avatarColor = getAvatarColor(name);
  const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.Pending;
  const genderIcon = item.preferred_gender === 'Nữ' ? 'female' : 'male';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TouchableOpacity onPress={() => router.push(`/profile/${item.sender_id}` as any)}>
          <View style={styles.avatar}>
            {item?.sender.avatar_url ? (
              <Image source={{ uri: item?.sender.avatar_url }} style={{ width: '100%', height: '100%', borderRadius: 32 }} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
                <Text style={[styles.avatarText, { color: avatarColor.text }]}>{getInitials(name)}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.senderInfo}>
          <Text style={styles.senderName} numberOfLines={1}>{name}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={11} color="#888780" />
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>
        </View>

        {!isOwner && (
          <TouchableOpacity style={styles.chatBtnSm} onPress={onChat} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={14} color="#534AB7" />
            <Text style={styles.chatBtnSmText}>Nhắn tin</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>

      <View style={styles.tags}>
        {item.preferred_gender && (
          <Tag icon={`${genderIcon}-outline`} label={item.preferred_gender} variant="gender" />
        )}
        {(item.min_age || item.max_age) && (
          <Tag icon="people-outline" label={`${item.min_age ?? '?'} – ${item.max_age ?? '?'} tuổi`} />
        )}
        {item.budget && <Tag icon="wallet-outline" label={formatBudget(item.budget)} variant="budget" />}
        {item.ward?.ward_name && <Tag icon="location-outline" label={item.ward.ward_name} />}
        {item.habits && <Tag icon="leaf-outline" label={item.habits} />}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        {isOwner && (
          <View style={styles.ownerActions}>
            <TouchableOpacity style={styles.btnEdit} onPress={onEdit} activeOpacity={0.7}>
              <Ionicons name="pencil-outline" size={13} color="#444441" />
              <Text style={styles.btnEditText}>Sửa</Text>
            </TouchableOpacity>
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

// ─── SCREEN ───────────────────────────────────────────────────────────────────

export default function RoommateIndex() {
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.id ?? 0;

  const [data, setData]   = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing]       = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [title, setTitle]               = useState('');
  const [habits, setHabits]             = useState('');
  const [budget, setBudget]             = useState('');
  const [preferred_gender, setPreferredGender] = useState('Nam');
  const [ward_id, setWardId]            = useState('');
  const [minAge, setMinAge]             = useState('');
  const [maxAge, setMaxAge]             = useState('');
  const [status, setStatus]             = useState('Pending');

  // Filter
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterParams, setFilterParams]   = useState({
    ward_id: '', preferred_gender: '', min_age: '', max_age: '', budget: '', title: '',
  });

  // Mobile picker modal — dùng chung cho tất cả các ô picker trên mobile
  const [mobilePickerConfig, setMobilePickerConfig] = useState<{
    visible: boolean;
    title: string;
    options: PickerOption[];
    onSelect: (val: string) => void;
  }>({ visible: false, title: '', options: [], onSelect: () => {} });

  const openMobilePicker = (title: string, options: PickerOption[], onSelect: (val: string) => void) => {
    setMobilePickerConfig({ visible: true, title, options, onSelect });
  };
  const closeMobilePicker = () => setMobilePickerConfig((p) => ({ ...p, visible: false }));

  // ── Fetch ────────────────────────────────────────────────────────────────

  useEffect(() => { fetchData(); fetchWards(); }, []);

  const fetchData = async (params: any = {}) => {
    setLoading(true);
    try {
      const result = await getListRoommateAPI({ index: 1, count: 20, ...params });
      setData(result?.data?.list ?? []);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  const fetchWards = async () => {
    try {
      const res = await getWardAPI();
      setWards(res.data ?? []);
    } catch {}
  };

  // ── Filter ───────────────────────────────────────────────────────────────

  const applyFilter = () => { fetchData(filterParams); setFilterVisible(false); };

  const resetFilter = () => {
    const empty = { ward_id: '', preferred_gender: '', min_age: '', max_age: '', budget: '', title: '' };
    setFilterParams(empty);
    fetchData({});
    setFilterVisible(false);
  };

  // ── Form ────────────────────────────────────────────────────────────────

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
    if (!title.trim() || !habits.trim())
      return Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề và yêu cầu.');

    const payload = {
      title, habits, preferred_gender,
      budget:   budget  ? Number(budget)  : undefined,
      ward_id:  ward_id ? Number(ward_id) : undefined,
      min_age:  minAge  ? Number(minAge)  : undefined,
      max_age:  maxAge  ? Number(maxAge)  : undefined,
      status,
      roommate_id: selectedItem?.request_id,
    };
    try {
      if (isEditing) await updateRoommateAPI(payload);
      else           await createRoommateAPI(payload);
      setModalVisible(false);
      fetchData();
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu. Vui lòng thử lại.');
    }
  };

  const handleDelete = (id: number) => {
    const performDelete = async () => {
      try {
        await deleteRoommateAPI(id);
        setData((prev) => prev.filter((item: any) => item.request_id !== id));
      } catch {
        Alert.alert('Lỗi', 'Không thể xóa bài đăng');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn chắc chắn muốn xóa?')) performDelete();
    } else {
      Alert.alert('Xác nhận', 'Bạn chắc chắn muốn xóa?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: performDelete },
      ]);
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

  // ── Options ──────────────────────────────────────────────────────────────

  const genderOptions: PickerOption[]       = [{ label: 'Nam', value: 'Nam' }, { label: 'Nữ', value: 'Nữ' }, { label: 'Không yêu cầu', value: 'Khác' }];
  const genderFilterOptions: PickerOption[] = [{ label: 'Tất cả', value: '' }, { label: 'Nam', value: 'Nam' }, { label: 'Nữ', value: 'Nữ' }];
  const statusOptions: PickerOption[]       = [{ label: 'Đang tìm', value: 'Pending' }, { label: 'Đang thương lượng', value: 'Negotiating' }, { label: 'Đã đóng', value: 'Closed' }];
  const wardOptions: PickerOption[]         = [{ label: 'Chọn phường / xã', value: '' }, ...wards.map((w: any) => ({ label: w.ward_name, value: String(w.ward_id) }))];
  const wardFilterOptions: PickerOption[]   = [{ label: 'Tất cả khu vực', value: '' },  ...wards.map((w: any) => ({ label: w.ward_name, value: String(w.ward_id) }))];

  const activeFilterCount = Object.values(filterParams).filter(Boolean).length;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>

      {/* Top bar */}
      <View style={styles.topbar}>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFilterVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? '#534AB7' : '#5F5E5A'} />
          <Text style={[styles.filterBtnText, activeFilterCount > 0 && { color: '#534AB7' }]}>
            Lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color="#534AB7" />
          <Text style={styles.addBtnText}>Đăng tìm bạn cùng phòng</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color="#534AB7" size="large" /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.request_id.toString()}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={48} color="#B4B2A9" />
              <Text style={styles.emptyText}>Chưa có bài đăng nào</Text>
              <Text style={styles.emptySubText}>Hãy là người đầu tiên đăng tìm bạn!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <RoommateCard
              item={item}
              currentUserId={currentUserId}
              onEdit={() => openModal(item)}
              onDelete={() => handleDelete(item.request_id)}
              onChat={() => handleStartChat(item.sender_id, item.sender?.full_name ?? 'Người dùng', item.sender?.avatar_url ?? '')}
            />
          )}
        />
      )}

      {/* ── FORM MODAL ──────────────────────────────────────────────────────── */}
<Modal visible={modalVisible} animationType="slide" transparent>
  <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        
        {/* LÔ-GIC ĐỔI NỘI DUNG: NẾU MỞ PICKER THÌ HIỆN DANH SÁCH, NẾU KHÔNG THÌ HIỆN FORM */}
        {mobilePickerConfig.visible ? (
          <View style={styles.inlinePickerContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{mobilePickerConfig.title}</Text>
              <TouchableOpacity onPress={closeMobilePicker}>
                <Ionicons name="close" size={22} color="#5F5E5A" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={mobilePickerConfig.options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    mobilePickerConfig.onSelect(item.value);
                    closeMobilePicker();
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          /* NỘI DUNG FORM ĐĂNG BÀI */
          <>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Chỉnh sửa bài đăng' : 'Đăng tìm bạn cùng phòng'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#5F5E5A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Tiêu đề *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Tìm bạn nữ ở ghép quận 3"
                  placeholderTextColor="#B4B2A9"
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={styles.fieldLabel}>Yêu cầu *</Text>
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

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Tuổi tối thiểu</Text>
                    <TextInput style={styles.input} placeholder="18" placeholderTextColor="#B4B2A9" value={minAge} onChangeText={setMinAge} keyboardType="numeric" />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Tuổi tối đa</Text>
                    <TextInput style={styles.input} placeholder="35" placeholderTextColor="#B4B2A9" value={maxAge} onChangeText={setMaxAge} keyboardType="numeric" />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Giới tính ưu tiên</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={preferred_gender} onValueChange={setPreferredGender} style={styles.picker}>
                    {genderOptions.map((o) => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
                  </Picker>
                </View>
              ) : (
                <MobilePickerField
                  selectedValue={preferred_gender}
                  options={genderOptions}
                  placeholder="Chọn giới tính"
                  onPress={() => openMobilePicker('Giới tính ưu tiên', genderOptions, setPreferredGender)}
                />
              )}

              <Text style={styles.fieldLabel}>Khu vực</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={ward_id} onValueChange={setWardId} style={styles.picker}>
                    {wardOptions.map((o) => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
                  </Picker>
                </View>
              ) : (
                <MobilePickerField
                  selectedValue={ward_id}
                  options={wardOptions}
                  placeholder="Chọn phường / xã"
                  onPress={() => openMobilePicker('Chọn khu vực', wardOptions, setWardId)}
                />
              )}

                {/* Trạng thái (chỉ khi edit) */}
                {isEditing && (
                  <>
                    <Text style={styles.fieldLabel}>Trạng thái</Text>
                    {Platform.OS === 'web' ? (
                      <View style={styles.pickerWrap}>
                        <Picker selectedValue={status} onValueChange={setStatus} style={styles.picker}>
                          {statusOptions.map((o) => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
                        </Picker>
                      </View>
                    ) : (
                      <MobilePickerField
                        selectedValue={status}
                        options={statusOptions}
                        placeholder="Chọn trạng thái"
                        onPress={() => openMobilePicker('Trạng thái', statusOptions, setStatus)}
                      />
                    )}
                  </>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                    <Text style={styles.btnCancelText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnSubmit} onPress={handleSave}>
                    <Text style={styles.btnSubmitText}>{isEditing ? 'Cập nhật' : 'Đăng bài'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
              </>
        )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── FILTER MODAL ─────────────────────────────────────────────────────── */}
<Modal visible={filterVisible} animationType="slide" transparent>
  <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        
        {/* NẾU ĐANG MỞ PICKER THÌ HIỂN THỊ DANH SÁCH, NẾU KHÔNG THÌ HIỂN THỊ FORM */}
        {mobilePickerConfig.visible ? (
          <View style={styles.inlinePickerContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{mobilePickerConfig.title}</Text>
              <TouchableOpacity onPress={closeMobilePicker}>
                <Ionicons name="close" size={22} color="#5F5E5A" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={mobilePickerConfig.options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    mobilePickerConfig.onSelect(item.value);
                    closeMobilePicker();
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          <>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bộ lọc tìm kiếm</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Ionicons name="close" size={22} color="#5F5E5A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Tiêu đề</Text>
              <TextInput
                style={styles.input}
                placeholder="Tiêu đề ..."
                placeholderTextColor="#B4B2A9"
                value={filterParams.title}
                onChangeText={(val) => setFilterParams({ ...filterParams, title: val })}
              />

              <Text style={styles.fieldLabel}>Khu vực</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={filterParams.ward_id} onValueChange={(val) => setFilterParams({ ...filterParams, ward_id: val })} style={styles.picker}>
                    {wardFilterOptions.map((o) => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
                  </Picker>
                </View>
              ) : (
                <MobilePickerField
                  selectedValue={filterParams.ward_id}
                  options={wardFilterOptions}
                  placeholder="Tất cả khu vực"
                  onPress={() => openMobilePicker('Chọn khu vực', wardFilterOptions, (val) => setFilterParams((p) => ({ ...p, ward_id: val })))}
                />
              )}

              <Text style={styles.fieldLabel}>Giới tính ưu tiên</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={filterParams.preferred_gender} onValueChange={(val) => setFilterParams({ ...filterParams, preferred_gender: val })} style={styles.picker}>
                    {genderFilterOptions.map((o) => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
                  </Picker>
                </View>
              ) : (
                <MobilePickerField
                  selectedValue={filterParams.preferred_gender}
                  options={genderFilterOptions}
                  placeholder="Tất cả"
                  onPress={() => openMobilePicker('Giới tính ưu tiên', genderFilterOptions, (val) => setFilterParams((p) => ({ ...p, preferred_gender: val })))}
                />
              )}

                <Text style={styles.fieldLabel}>Ngân sách tối đa (VNĐ)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 4000000"
                  placeholderTextColor="#B4B2A9"
                  keyboardType="numeric"
                  value={filterParams.budget}
                  onChangeText={(val) => setFilterParams({ ...filterParams, budget: val })}
                />

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Tuổi tối thiểu</Text>
                    <TextInput style={styles.input} placeholder="18" placeholderTextColor="#B4B2A9" keyboardType="numeric" value={filterParams.min_age} onChangeText={(val) => setFilterParams({ ...filterParams, min_age: val })} />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Tuổi tối đa</Text>
                    <TextInput style={styles.input} placeholder="35" placeholderTextColor="#B4B2A9" keyboardType="numeric" value={filterParams.max_age} onChangeText={(val) => setFilterParams({ ...filterParams, max_age: val })} />
                  </View>
                </View>

                <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnCancel} onPress={resetFilter}>
                  <Text style={styles.btnCancelText}>Xóa lọc</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSubmit} onPress={applyFilter}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={[styles.btnSubmitText, { marginLeft: 4 }]}>Áp dụng</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </>
        )}
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>

      {/* ── MOBILE PICKER MODAL ───────────────────────────────────────────────── */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={mobilePickerConfig.visible}
          animationType="slide"
          transparent
          onRequestClose={closeMobilePicker}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { maxHeight: '60%' }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{mobilePickerConfig.title}</Text>
                <TouchableOpacity onPress={closeMobilePicker}>
                  <Ionicons name="close" size={22} color="#5F5E5A" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={mobilePickerConfig.options}
                keyExtractor={(o) => o.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      mobilePickerConfig.onSelect(item.value);
                      closeMobilePicker();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerItemText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  topbar: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10,
    backgroundColor: '#ecf0e4',
  },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 0.5, borderColor: '#D3D1C7', backgroundColor: '#fff',
  },
  filterBtnActive: { borderColor: '#CECBF6', backgroundColor: '#EEEDFE' },
  filterBtnText: { fontSize: 13, color: '#5F5E5A', fontWeight: '500' },

  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 10, borderWidth: 0.5,
    borderColor: '#CECBF6', backgroundColor: '#EEEDFE',
  },
  addBtnText: { fontSize: 13, color: '#3C3489', fontWeight: '500' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 14, paddingBottom: 24, paddingTop: 4 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 0.5, borderColor: '#D3D1C7', padding: 14, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 14, fontWeight: '500' },
  senderInfo: { flex: 1, minWidth: 0 },
  senderName: { fontSize: 14, fontWeight: '500', color: '#2C2C2A' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  timeText: { fontSize: 11, color: '#888780' },
  chatBtnSm: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 0.5, borderColor: '#D3D1C7', backgroundColor: '#F1EFE8', flexShrink: 0,
  },
  chatBtnSmText: { fontSize: 12, color: '#3C3489', fontWeight: '500' },
  cardTitle: { fontSize: 15, fontWeight: '500', color: '#2C2C2A', lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 0.5 },
  tagText: { fontSize: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#E8E6DF' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '500' },
  ownerActions: { flexDirection: 'row', gap: 6 },
  btnEdit: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, borderWidth: 0.5, borderColor: '#D3D1C7', backgroundColor: '#F1EFE8' },
  btnEditText: { fontSize: 12, color: '#444441', fontWeight: '500' },
  btnDel: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, borderWidth: 0.5, borderColor: '#F7C1C1', backgroundColor: '#FCEBEB' },
  btnDelText: { fontSize: 12, color: '#A32D2D', fontWeight: '500' },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 72, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '500', color: '#5F5E5A' },
  emptySubText: { fontSize: 13, color: '#B4B2A9' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 18, paddingBottom: Platform.OS === 'ios' ? 36 : 24, maxHeight: '90%',
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D3D1C7', alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#E8E6DF', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#2C2C2A' },

  fieldLabel: { fontSize: 12, color: '#888780', marginBottom: 6, marginTop: 4, fontWeight: '500' },
  input: {
    borderWidth: 0.5, borderColor: '#D3D1C7', borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 10,
    fontSize: 14, color: '#2C2C2A', backgroundColor: '#FAFAF8', marginBottom: 12,
  },
  row: { flexDirection: 'row' },
  pickerWrap: { borderWidth: 0.5, borderColor: '#D3D1C7', borderRadius: 10, backgroundColor: '#FAFAF8', marginBottom: 12, overflow: 'hidden' },
  picker: { height: 48, color: '#2C2C2A' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 8 },
  btnCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 0.5, borderColor: '#D3D1C7', backgroundColor: '#F1EFE8', alignItems: 'center' },
  btnCancelText: { fontSize: 14, color: '#5F5E5A', fontWeight: '500' },
  btnSubmit: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#534AB7', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnSubmitText: { fontSize: 14, color: '#fff', fontWeight: '500' },

  // Mobile picker modal
  pickerItem: { paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 0.5, borderBottomColor: '#E8E6DF' },
  pickerItemText: { fontSize: 14, color: '#2C2C2A' },
});