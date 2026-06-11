import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Platform, Alert, ActivityIndicator,
  FlatList, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createContractAPI, findUserAPI } from '@/store/contract.service';

interface UserResult {
  user_id: number;
  full_name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
}

export default function CreateContractScreen() {
  const router = useRouter();
  const { room_id, address, monthly_rent } = useLocalSearchParams<{
    room_id: string;
    address: string;
    monthly_rent: string;
  }>();

  // User search
  const [searchKey, setSearchKey] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<UserResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Contract fields
  const [monthlyRent, setMonthlyRent] = useState(monthly_rent ?? '');
  const [depositAmount, setDepositAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  
  const formatDate = (d: Date) => d.toLocaleDateString('vi-VN');
  const formatPrice = (p: string) => {
    const n = Number(p.replace(/\D/g, ''));
    return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} triệu` : p;
  };

  // Search user với debounce
  const handleSearch = useCallback((text: string) => {
    setSearchKey(text);
    setSelectedTenant(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || text.length < 2) { setSearchResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await findUserAPI(text);
        setSearchResults(res.data ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }, []);

  const handleSelectTenant = (user: UserResult) => {
    setSelectedTenant(user);
    setSearchKey(user.full_name);
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!selectedTenant) { Alert.alert('Lỗi', 'Vui lòng chọn người thuê!'); return; }
    if (!monthlyRent) { Alert.alert('Lỗi', 'Vui lòng nhập giá thuê!'); return; }
    if (!depositAmount) { Alert.alert('Lỗi', 'Vui lòng nhập tiền cọc!'); return; }

    try {
      setLoading(true);
      await createContractAPI({
        room_id: Number(room_id),
        tenant_id: selectedTenant.user_id,
        start_date: startDate.toISOString(),
        end_date: endDate?.toISOString(),
        monthly_rent: Number(monthlyRent.replace(/\D/g, '')),
        deposit_amount: Number(depositAmount.replace(/\D/g, '')),
        draft_data: { notes },
      });

      if(Platform.OS === 'web'){
        window.alert(
        ' Tạo hợp đồng thành công!',
      );
      }
      Alert.alert(
        '✅ Tạo hợp đồng thành công!',
        `Đã gửi yêu cầu xác nhận hợp đồng đến ${selectedTenant.full_name}. Chờ họ xác nhận để tiến hành ký kết.`,
        [{ text: 'OK'}]
      );
      router.replace('/'); 
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || err.message || 'Tạo hợp đồng thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo hợp đồng thuê</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Địa chỉ phòng */}
        <View style={styles.section}>
          <View style={styles.addressCard}>
            <Ionicons name="home-outline" size={20} color="#4F46E5" />
            <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
          </View>
        </View>

        {/* Tìm người thuê */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Người thuê</Text>

          {selectedTenant ? (
            // Đã chọn user
            <View style={styles.selectedUser}>
              <View style={styles.selectedUserAvatar}>
                {selectedTenant.avatar_url ? (
                  <Image source={{ uri: selectedTenant.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>
                    {selectedTenant.full_name?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                )}
              </View>
              <View style={styles.selectedUserInfo}>
                <Text style={styles.selectedUserName}>{selectedTenant.full_name}</Text>
                <Text style={styles.selectedUserEmail}>{selectedTenant.email}</Text>
                {selectedTenant.phone && (
                  <Text style={styles.selectedUserEmail}>{selectedTenant.phone}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.changeUserBtn}
                onPress={() => { setSelectedTenant(null); setSearchKey(''); }}
              >
                <Text style={styles.changeUserBtnText}>Đổi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Search box
            <View>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  value={searchKey}
                  onChangeText={handleSearch}
                  placeholder="Tìm theo tên người thuê..."
                  placeholderTextColor="#9CA3AF"
                />
                {searching && <ActivityIndicator size="small" color="#4F46E5" />}
                {searchKey.length > 0 && !searching && (
                  <TouchableOpacity onPress={() => { setSearchKey(''); setSearchResults([]); }}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Kết quả tìm kiếm */}
              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map(user => (
                    <TouchableOpacity
                      key={user.user_id}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectTenant(user)}
                    >
                      <View style={styles.resultAvatar}>
                        {user.avatar_url ? (
                          <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                        ) : (
                          <Text style={styles.avatarText}>
                            {user.full_name?.[0]?.toUpperCase() ?? '?'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultName}>{user.full_name}</Text>
                        <Text style={styles.resultEmail}>{user.phone}</Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color="#4F46E5" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {searchKey.length >= 2 && searchResults.length === 0 && !searching && (
                <Text style={styles.noResult}>Không tìm thấy người dùng nào</Text>
              )}
            </View>
          )}
        </View>

        {/* Tài chính */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Điều khoản tài chính</Text>

          <Text style={styles.label}>Giá thuê/tháng (VNĐ) <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input} value={monthlyRent}
            onChangeText={setMonthlyRent} keyboardType="numeric"
            placeholder="VD: 3000000"
          />

          <Text style={styles.label}>Tiền cọc (VNĐ) <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input} value={depositAmount}
            onChangeText={setDepositAmount} keyboardType="numeric"
            placeholder="VD: 6000000"
          />

          
        </View>

        {/* Thời hạn */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thời hạn hợp đồng</Text>

          <Text style={styles.label}>Ngày bắt đầu <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowStartPicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
            <Text style={styles.datePickerText}>{formatDate(startDate)}</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Ngày kết thúc</Text>
          {Platform.OS === 'web' ? (
  <input 
    type="date" 
    value={endDate ? endDate.toISOString().split('T')[0] : ''} 
    onChange={(e) => setEndDate(new Date(e.target.value))}
    style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}
  />
) :
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowEndPicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <Text style={[styles.datePickerText, !endDate && { color: '#9CA3AF' }]}>
              {endDate ? formatDate(endDate) : 'Không xác định'}
            </Text>
            {endDate && (
              <TouchableOpacity onPress={() => setEndDate(null)}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>}

          {showStartPicker && (
            <DateTimePicker value={startDate} mode="date"
              onChange={(_, d) => { setShowStartPicker(false); if (d) setStartDate(d); }} />
          )}
          {showEndPicker && (
            <DateTimePicker value={endDate ?? new Date()} mode="date" minimumDate={startDate}
              onChange={(_, d) => { setShowEndPicker(false); if (d) setEndDate(d); }} />
          )}
        </View>

        {/* Ghi chú */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Điều khoản bổ sung</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={notes} onChangeText={setNotes}
            placeholder="Các điều khoản bổ sung (nếu có)..."
            multiline numberOfLines={4} textAlignVertical="top"
          />
        </View>

        {/* Tóm tắt */}
        {selectedTenant && monthlyRent && depositAmount && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tóm tắt hợp đồng</Text>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Người thuê</Text>
                <Text style={styles.summaryValue}>{selectedTenant.full_name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Giá thuê</Text>
                <Text style={styles.summaryValue}>{formatPrice(monthlyRent)}/tháng</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tiền cọc</Text>
                <Text style={styles.summaryValue}>{formatPrice(depositAmount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Bắt đầu</Text>
                <Text style={styles.summaryValue}>{formatDate(startDate)}</Text>
              </View>
              
            </View>
          </View>
        )}

        {/* Submit */}
        <View style={[styles.section, { paddingBottom: 32 }]}>
          <TouchableOpacity
            style={[styles.submitBtn, (!selectedTenant || loading) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!selectedTenant || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Gửi hợp đồng cho người thuê</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.submitHint}>
            Người thuê sẽ nhận thông báo và cần xác nhận trước khi ký kết
          </Text>
        </View>
      </ScrollView>
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
  scroll: { flex: 1 },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 14 },

  addressCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12,
  },
  addressText: { flex: 1, fontSize: 14, color: '#4F46E5', fontWeight: '500', lineHeight: 20 },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FAFAFA',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111', padding: 0 },
  searchResults: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    backgroundColor: '#fff', marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
  },
  searchResultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  resultAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '600', color: '#111' },
  resultEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  noResult: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },

  // Selected user
  selectedUser: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: '#10B981',
  },
  selectedUserAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  selectedUserInfo: { flex: 1 },
  selectedUserName: { fontSize: 15, fontWeight: '700', color: '#111' },
  selectedUserEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  changeUserBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#10B981',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  changeUserBtnText: { fontSize: 13, color: '#10B981', fontWeight: '600' },

  // Form
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  required: { color: '#EF4444' },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#111', backgroundColor: '#FAFAFA',
  },
  textarea: { height: 100, textAlignVertical: 'top' },

  // Due day
  dueDayRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  dueDayBtn: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  dueDayBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  dueDayText: { fontSize: 13, color: '#6B7280' },
  dueDayTextActive: { color: '#4F46E5', fontWeight: '700' },

  // Date picker
  datePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, backgroundColor: '#FAFAFA',
  },
  datePickerText: { flex: 1, fontSize: 14, color: '#111' },

  // Summary
  summaryBox: {
    backgroundColor: '#F9FAFB', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#111' },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#10B981', borderRadius: 14, padding: 16,
  },
  submitBtnDisabled: { backgroundColor: '#D1D5DB' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  submitHint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 10 },
});