import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, FlatList, Image, ActivityIndicator,
  Alert, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API } from '@/store/authStore';
import { getPostsAPI } from '@/store/post.service';
import { router } from 'expo-router';

// ─── API helpers ────────────────────────────────────────────────────────────
const findUserAPI = async (key: string) => {
  const res = await API.get('/user/findUser', { params: { key } });
  return res.data;
};

const createReportAPI = async (data: any) => {
  const res = await API.post('/user/createReport', data);
  return res.data;
};

// ─── Types ──────────────────────────────────────────────────────────────────
type ReportTarget =
  | { type: 'user'; id: number; name: string; avatar?: string }
  | { type: 'room'; id: number; title: string; image?: string; ownerName?: string }
  | { type: 'app'};

const REASONS = [
  'Lừa đảo / Gian lận',
  'Thông tin sai sự thật',
  'Nội dung không phù hợp',
  'Spam / Quảng cáo',
  'Quấy rối / Xúc phạm',
  'Khác',
];
const APP_REASONS = [
  'Lỗi giao diện / hiển thị',
  'Lỗi không thao tác được',
  'App bị crash / đứng',
  'Lỗi thanh toán',
  'Lỗi thông báo',
  'Khác',
];

// ═══════════════════════════════════════════════════════════════════════════
export function ReportFAB() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'search' | 'form'>('search');

  // search
  const [tab, setTab] = useState<'user' | 'post' | 'app'>('user');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // form
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetAll = () => {
    setStep('search');
    setQuery('');
    setResults([]);
    setTarget(null);
    setReason('');
    setDetail('');
    setTab('user');
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(resetAll, 200);
  };

  // ── Search ────────────────────────────────────────────────────────────
  const handleSearch = useCallback((text: string, currentTab: 'user' | 'post') => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || text.length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        if (currentTab === 'user') {
          const res = await findUserAPI(text);
          setResults(res.data ?? []);
        } else {
          const res = await getPostsAPI({ search: text, limit: 10 } as any);
          setResults(res.data ?? []);
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }, []);

  const handleSwitchTab = (newTab: 'user' | 'post') => {
    setTab(newTab);
    setResults([]);
    setQuery('');
    setTarget(null);
  };

  const handleSelectTarget = (item: any) => {
    if (tab === 'user') {
      setTarget({
        type: 'user',
        id: item.user_id,
        name: item.full_name,
        avatar: item.avatar_url,
      });
    } else {
      setTarget({
        type: 'post',
        id: item.post_id,
        title: item.title,
        image: item.media?.[0]?.file_url,
        ownerName: item.room?.owner?.full_name,
      });
    }
    setStep('form');
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!reason) { Alert.alert('Lỗi', 'Vui lòng chọn lý do báo cáo!'); return; }
    if (!target) return;

    try {
      setSubmitting(true);
      await createReportAPI({
        target_type: target.type,
        target_id: target.type === 'app' ? null : target.id,
        reason: detail.trim() ? `${reason}: ${detail.trim()}` : reason,
      });
      handleClose();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Gửi báo cáo thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Ionicons name="flag-outline" size={22} color="#fff" />
      </TouchableOpacity>

      {/* ── MODAL ───────────────────────────────────────────────────── */}
      <Modal visible={open} animationType="slide" transparent onRequestClose={handleClose}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              {step === 'form' ? (
                <TouchableOpacity onPress={() => setStep('search')}>
                  <Ionicons name="arrow-back" size={22} color="#111" />
                </TouchableOpacity>
              ) : <View style={{ width: 22 }} />}
              <Text style={styles.sheetTitle}>
                {step === 'search' ? 'Tạo báo cáo' : 'Chi tiết báo cáo'}
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={22} color="#111" />
              </TouchableOpacity>
            </View>

            {/* ── STEP 1: SEARCH ─────────────────────────────────────── */}
            {step === 'search' && (
              <View style={{ flex: 1 }}>
                {/* Tabs */}
                <View style={styles.tabs}>
                  <TouchableOpacity
                    style={[styles.tab, tab === 'user' && styles.tabActive]}
                    onPress={() => handleSwitchTab('user')}
                  >
                    <Ionicons name="person-outline" size={16} color={tab === 'user' ? '#4F46E5' : '#9CA3AF'} />
                    <Text style={[styles.tabText, tab === 'user' && styles.tabTextActive]}>Người dùng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, tab === 'post' && styles.tabActive]}
                    onPress={() => handleSwitchTab('post')}
                  >
                    <Ionicons name="home-outline" size={16} color={tab === 'post' ? '#4F46E5' : '#9CA3AF'} />
                    <Text style={[styles.tabText, tab === 'post' && styles.tabTextActive]}>Bài đăng</Text>
                </TouchableOpacity>
                  <TouchableOpacity
    style={[styles.tab, tab === 'app' && styles.tabActive]}
    onPress={() => {
      setTab('app');
      setTarget({ type: 'app' });
      setStep('form');
    }}
  >
    <Ionicons name="bug-outline" size={16} color={tab === 'app' ? '#4F46E5' : '#9CA3AF'} />
    <Text style={[styles.tabText, tab === 'app' && styles.tabTextActive]}>Lỗi app</Text>
  </TouchableOpacity>
                </View>
                {tab !== 'app'&&(
                    <>
                {/* Search box */}
                <View style={styles.searchBox}>
                  <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={tab === 'user' ? 'Tìm theo tên người dùng...' : 'Tìm theo tiêu đề bài đăng...'}
                    placeholderTextColor="#9CA3AF"
                    value={query}
                    onChangeText={text => handleSearch(text, tab)}
                  />
                  {searching && <ActivityIndicator size="small" color="#4F46E5" />}
                </View>

                {/* Results */}
                <FlatList
                  data={results}
                  keyExtractor={(item, i) => (item.user_id ?? item.post_id ?? i).toString()}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                  renderItem={({ item }) => {
                    if (tab === 'user') {
                      return (
                        <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectTarget(item)}>
                          <View style={styles.resultAvatar}>
                            {item.avatar_url ? (
                              <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
                            ) : (
                              <Text style={styles.avatarText}>{item.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                            )}
                          </View>
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultName}>{item.full_name}</Text>
                            <Text style={styles.resultSub}>{item.email}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                        </TouchableOpacity>
                      );
                    }
                    const imageUrl = item.media?.[0]?.file_url;
                    return (
                      <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectTarget(item)}>
                        <View style={styles.resultPostImage}>
                          {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.avatarImg} />
                          ) : (
                            <Ionicons name="image-outline" size={20} color="#D1D5DB" />
                          )}
                        </View>
                        <View style={styles.resultInfo}>
                          <Text style={styles.resultName} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.resultSub} numberOfLines={1}>
                            {item.room?.owner?.full_name ?? 'Ẩn danh'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    query.length >= 2 && !searching ? (
                      <Text style={styles.noResult}>Không tìm thấy kết quả nào</Text>
                    ) : (
                      <Text style={styles.searchHint}>
                        Nhập từ khóa để tìm {tab === 'user' ? 'người dùng' : 'bài đăng'} cần báo cáo
                      </Text>
                    )
                  }
                  
                />
                </>
                )}
                
              </View>
            )}

            {/* ── STEP 2: FORM ───────────────────────────────────────── */}
            {step === 'form' && target && (
  <ScrollView style={{ paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">

    {/* Target preview — chỉ hiện nếu không phải app */}
    {target.type !== 'app' && (
      <View style={styles.targetCard}>
        <View style={target.type === 'user' ? styles.resultAvatar : styles.resultPostImage}>
          {target.type === 'user' ? (
            target.avatar ? (
              <Image source={{ uri: target.avatar }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{target.name?.[0]?.toUpperCase() ?? '?'}</Text>
            )
          ) : (
            target.image ? (
              <Image source={{ uri: target.image }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="image-outline" size={20} color="#D1D5DB" />
            )
          )}
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultName} numberOfLines={1}>
            {target.type === 'user' ? target.name : target.title}
          </Text>
          <Text style={styles.resultSub}>
            {target.type === 'user' ? 'Báo cáo người dùng' : `Bài đăng • ${target.ownerName ?? ''}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setStep('search')}>
          <Text style={styles.changeText}>Đổi</Text>
        </TouchableOpacity>
      </View>
    )}

    {/* Banner cho lỗi app */}
    {target.type === 'app' && (
      <View style={styles.appBanner}>
        <Ionicons name="bug-outline" size={28} color="#F59E0B" />
        <Text style={styles.appBannerText}>Báo cáo lỗi ứng dụng</Text>
      </View>
    )}

    {/* Reasons — đổi danh sách theo type */}
    <Text style={styles.formLabel}>Lý do báo cáo <Text style={{ color: '#EF4444' }}>*</Text></Text>
    {(target.type === 'app' ? APP_REASONS : REASONS).map(r => (
      <TouchableOpacity
        key={r}
        style={[styles.reasonItem, reason === r && styles.reasonItemActive]}
        onPress={() => setReason(r)}
      >
        <View style={[styles.radio, reason === r && styles.radioActive]}>
          {reason === r && <View style={styles.radioDot} />}
        </View>
        <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{r}</Text>
      </TouchableOpacity>
    ))}

    {/* Detail */}
    <Text style={styles.formLabel}>
      {target.type === 'app' ? 'Mô tả lỗi chi tiết' : 'Mô tả thêm (không bắt buộc)'}
      {target.type === 'app' && <Text style={{ color: '#EF4444' }}> *</Text>}
    </Text>
    <TextInput
      style={styles.detailInput}
      placeholder={target.type === 'app'
        ? 'Mô tả lỗi bạn gặp: ở đâu, khi nào, thao tác gì...'
        : 'Mô tả chi tiết vấn đề bạn gặp phải...'}
      placeholderTextColor="#9CA3AF"
      value={detail}
      onChangeText={setDetail}
      multiline
      numberOfLines={4}
      textAlignVertical="top"
    />

    {/* Submit */}
    <TouchableOpacity
      style={[
        styles.submitBtn,
        (!reason || submitting || (target.type === 'app' && !detail.trim())) && styles.submitBtnDisabled,
      ]}
      onPress={handleSubmit}
      disabled={!reason || submitting || (target.type === 'app' && !detail.trim())}
    >
      {submitting
        ? <ActivityIndicator color="#fff" />
        : <Text style={styles.submitBtnText}>Gửi báo cáo</Text>}
    </TouchableOpacity>

    <View style={{ height: 24 }} />
  </ScrollView>
)}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 200, right: 16,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
    zIndex: 999,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: '85%', paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 12 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111' },

  // Tabs
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 10,
  },
  tabActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  tabText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  tabTextActive: { color: '#4F46E5' },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 12, padding: 10,
    backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111', padding: 0 },

  // Results
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  resultAvatar: {
    width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
    backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center',
  },
  resultPostImage: {
    width: 44, height: 44, borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '600', color: '#111' },
  resultSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  noResult: { textAlign: 'center', fontSize: 13, color: '#9CA3AF', marginTop: 30 },
  searchHint: { textAlign: 'center', fontSize: 13, color: '#9CA3AF', marginTop: 30, paddingHorizontal: 30 },
  changeText: { fontSize: 13, color: '#4F46E5', fontWeight: '600' },

  // Target card
  targetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginVertical: 12,
  },

  // Form
  formLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 10 },
  reasonItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, marginBottom: 8,
  },
  reasonItemActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: '#4F46E5' },
  radioDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#4F46E5' },
  reasonText: { fontSize: 14, color: '#374151' },
  reasonTextActive: { color: '#4F46E5', fontWeight: '600' },

  detailInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#111', height: 90, backgroundColor: '#FAFAFA',
  },

  submitBtn: {
    backgroundColor: '#EF4444', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 20,
  },
  submitBtnDisabled: { backgroundColor: '#FCA5A5' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  appBanner: {
  alignItems: 'center', gap: 8,
  backgroundColor: '#FFFBEB', borderRadius: 12,
  padding: 20, marginVertical: 12,
  borderWidth: 1, borderColor: '#FDE68A',
},
appBannerText: { fontSize: 15, fontWeight: '700', color: '#92400E' },
});