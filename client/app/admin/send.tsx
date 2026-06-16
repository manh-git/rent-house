import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, ActivityIndicator, Alert,
  FlatList, Image, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { sendSystemNotificationAPI } from '@/store/admin.service';
import { API } from '@/store/authStore';

const findUserAPI = async (key: string) => {
  const res = await API.get('/user/findUser', { params: { key } });
  return res.data;
};

interface SelectedUser {
  user_id: number;
  full_name: string;
  email: string;
  avatar_url?: string;
}

export default function SendNotificationScreen() {
  const router = useRouter();

  const [target, setTarget] = useState<'all' | 'specific'>('all');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || text.length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await findUserAPI(text);
        setResults(res.data ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }, []);

  const handleSelectUser = (user: any) => {
    if (selectedUsers.some(u => u.user_id === user.user_id)) return;
    setSelectedUsers(prev => [...prev, {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      avatar_url: user.avatar_url,
    }]);
    setQuery('');
    setResults([]);
  };

  const handleRemoveUser = (userId: number) => {
    setSelectedUsers(prev => prev.filter(u => u.user_id !== userId));
  };

  const handleSend = async() => {
    if (!title.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề!'); return; }
    if (!body.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập nội dung!'); return; }
    if (target === 'specific' && selectedUsers.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 người dùng!');
      return;
    }

    const targetDesc = target === 'all'
      ? 'TẤT CẢ người dùng'
      : `${selectedUsers.length} người dùng đã chọn`;

    if(Platform.OS === 'web'){
        window.alert('Xác nhận gửi thông báo!');
        setSending(true);
        const userIds = target === 'all' ? [] : selectedUsers.map(u => u.user_id);
        await sendSystemNotificationAPI(userIds, title.trim(), body.trim());
        router.back()
    }
    else {
    Alert.alert(
      'Xác nhận gửi thông báo',
      `Gửi đến: ${targetDesc}\n\nTiêu đề: ${title}\nNội dung: ${body}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gửi', onPress: async () => {
            try {
              setSending(true);
              const userIds = target === 'all' ? [] : selectedUsers.map(u => u.user_id);
              await sendSystemNotificationAPI(userIds, title.trim(), body.trim());
              Alert.alert('✅ Thành công', 'Đã gửi thông báo!', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Gửi thất bại!');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
}
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gửi thông báo hệ thống</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Target type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đối tượng nhận</Text>
          <View style={styles.targetTabs}>
            <TouchableOpacity
              style={[styles.targetTab, target === 'all' && styles.targetTabActive]}
              onPress={() => setTarget('all')}
            >
              <Ionicons name="globe-outline" size={18} color={target === 'all' ? '#4F46E5' : '#9CA3AF'} />
              <Text style={[styles.targetTabText, target === 'all' && styles.targetTabTextActive]}>
                Tất cả người dùng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.targetTab, target === 'specific' && styles.targetTabActive]}
              onPress={() => setTarget('specific')}
            >
              <Ionicons name="people-outline" size={18} color={target === 'specific' ? '#4F46E5' : '#9CA3AF'} />
              <Text style={[styles.targetTabText, target === 'specific' && styles.targetTabTextActive]}>
                Chọn người dùng
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search & select users */}
        {target === 'specific' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tìm người dùng</Text>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm theo tên..."
                placeholderTextColor="#9CA3AF"
                value={query}
                onChangeText={handleSearch}
              />
              {searching && <ActivityIndicator size="small" color="#4F46E5" />}
            </View>

            {results.length > 0 && (
              <View style={styles.resultList}>
                {results.map(user => (
                  <TouchableOpacity
                    key={user.user_id}
                    style={styles.resultItem}
                    onPress={() => handleSelectUser(user)}
                  >
                    <View style={styles.resultAvatar}>
                      {user.avatar_url ? (
                        <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                      ) : (
                        <Text style={styles.avatarText}>{user.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                      )}
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{user.full_name}</Text>
                      <Text style={styles.resultEmail}>{user.email}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color="#4F46E5" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <View style={styles.selectedSection}>
                <Text style={styles.selectedTitle}>Đã chọn ({selectedUsers.length})</Text>
                {selectedUsers.map(user => (
                  <View key={user.user_id} style={styles.selectedItem}>
                    <View style={styles.resultAvatar}>
                      {user.avatar_url ? (
                        <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                      ) : (
                        <Text style={styles.avatarText}>{user.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                      )}
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{user.full_name}</Text>
                      <Text style={styles.resultEmail}>{user.email}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveUser(user.user_id)}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nội dung thông báo</Text>

          <Text style={styles.label}>Tiêu đề <Text style={{ color: '#EF4444' }}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="VD: Thông báo bảo trì hệ thống"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Nội dung <Text style={{ color: '#EF4444' }}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={body}
            onChangeText={setBody}
            placeholder="Nhập nội dung chi tiết..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Send button */}
        <View style={[styles.section, { paddingBottom: 32 }]}>
          <TouchableOpacity
            style={[styles.sendBtn, sending && { opacity: 0.6 }]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="send-outline" size={18} color="#fff" />
                  <Text style={styles.sendBtnText}>Gửi thông báo</Text>
                </>}
          </TouchableOpacity>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  scroll: { flex: 1 },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 12 },

  targetTabs: { flexDirection: 'row', gap: 10 },
  targetTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12,
  },
  targetTabActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  targetTabText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  targetTabTextActive: { color: '#4F46E5' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 10, backgroundColor: '#FAFAFA',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111', padding: 0 },
  resultList: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    backgroundColor: '#fff', marginTop: 4, overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  resultAvatar: {
    width: 36, height: 36, borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 13, fontWeight: '600', color: '#111' },
  resultEmail: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  selectedSection: { marginTop: 12 },
  selectedTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8 },
  selectedItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginBottom: 6,
    borderWidth: 1, borderColor: '#D1FAE5',
  },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#111', backgroundColor: '#FAFAFA',
  },
  textarea: { height: 110, textAlignVertical: 'top' },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#4F46E5', borderRadius: 14, padding: 16,
  },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});