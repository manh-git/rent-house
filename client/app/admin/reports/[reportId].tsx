import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, ActivityIndicator, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getListReportsAPI, markReportAsReadAPI, deletePostAPI, lockUserAPI } from '@/store/admin.service';
import { API } from '@/store/authStore';
import { getPostsAPI } from '@/store/post.service';

const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  user: { icon: 'person-outline', color: '#3B82F6', bg: '#EFF6FF', label: 'Báo cáo người dùng' },
  post: { icon: 'home-outline', color: '#F59E0B', bg: '#FFFBEB', label: 'Báo cáo bài đăng' },
  app:  { icon: 'bug-outline', color: '#EF4444', bg: '#FEF2F2', label: 'Báo cáo lỗi app' },
};

const findUserByIdAPI = async (userId: number) => {
  const res = await API.get(`/user/getUserById/${userId}`);
  return res.data;
};

export default function ReportDetailScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const router = useRouter();

  const [report, setReport] = useState<any>(null);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [targetPost, setTargetPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get(`/admin/report/${reportId}`);
        const data = res.data?.data ?? res.data;
        setReport(data);

        // Load thông tin target
        if (data.target_type === 'user' && data.target_id) {
          try {
            const userRes = await findUserByIdAPI(data.target_id);
            setTargetUser(userRes.data);
          } catch {}
        } else if (data.target_type === 'post' && data.target_id) {
          try {
            const postsRes = await getPostsAPI({ limit: 50 } as any);
            const found = (postsRes.data ?? []).find((p: any) => p.post_id === data.target_id);
            setTargetPost(found ?? null);
          } catch {}
        }
      } catch (e) {
        console.error(e);
        Alert.alert('Lỗi', 'Không thể tải báo cáo!');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reportId]);

  const handleMarkResolved = async () => {
    try {
      setProcessing(true);
      await markReportAsReadAPI(Number(reportId));
      setReport((prev: any) => ({ ...prev, status: 'resolved' }));
      Alert.alert('✅ Thành công', 'Đã đánh dấu báo cáo đã xử lý!');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Thất bại!');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeletePost = () => {
    if (!targetPost) return;
    Alert.prompt(
      'Xóa bài đăng',
      'Nhập lý do xóa:',
      async (reason) => {
        if (!reason?.trim()) return;
        try {
          await deletePostAPI(targetPost.post_id, targetPost.room.room_id, reason);
          Alert.alert('✅ Đã xóa bài đăng!');
          handleMarkResolved();
        } catch (err: any) {
          Alert.alert('Lỗi', err?.response?.data?.message || 'Thất bại!');
        }
      }
    );
  };

  const handleLockUser = () => {
    if (!targetUser) return;
    Alert.prompt(
      'Khóa tài khoản',
      'Nhập lý do khóa:',
      async (reason) => {
        if (!reason?.trim()) return;
        try {
          await lockUserAPI(targetUser.user_id, reason);
          Alert.alert('✅ Đã khóa tài khoản!');
          handleMarkResolved();
        } catch (err: any) {
          Alert.alert('Lỗi', err?.response?.data?.message || 'Thất bại!');
        }
      }
    );
  };

  if (loading) return (
    <View style={styles.loadingBox}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );

  if (!report) return null;

  const typeInfo = TYPE_ICONS[report.target_type] ?? TYPE_ICONS.app;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết báo cáo #{report.report_id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Type badge */}
        <View style={styles.section}>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
            <Ionicons name={typeInfo.icon as any} size={18} color={typeInfo.color} />
            <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
          </View>

          <View style={[styles.statusBadge, report.status === 'resolved' ? styles.statusResolved : styles.statusPending]}>
            <Text style={[styles.statusText, { color: report.status === 'resolved' ? '#10B981' : '#F59E0B' }]}>
              {report.status === 'resolved' ? 'Đã xử lý' : 'Chờ xử lý'}
            </Text>
          </View>
        </View>

        {/* Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lý do báo cáo</Text>
          <Text style={styles.reasonBox}>{report.reason}</Text>
        </View>

        {/* Sender */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Người báo cáo</Text>
          <View style={styles.personCard}>
            <View style={styles.personAvatar}>
              <Text style={styles.personAvatarText}>
                {report.sender?.full_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.personInfo}>
              <Text style={styles.personName}>{report.sender?.full_name}</Text>
              <Text style={styles.personEmail}>{report.sender?.email}</Text>
            </View>
          </View>
          <Text style={styles.timeText}>
            Báo cáo lúc: {new Date(report.created_at ?? report.updated_at).toLocaleString('vi-VN')}
          </Text>
        </View>

        {/* Target user */}
        {report.target_type === 'user' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Người dùng bị báo cáo</Text>
            {targetUser ? (
              <>
                <View style={styles.personCard}>
                  <View style={[styles.personAvatar, { backgroundColor: '#FCA5A5' }]}>
                    {targetUser.avatar_url ? (
                      <Image source={{ uri: targetUser.avatar_url }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.personAvatarText}>
                        {targetUser.full_name?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{targetUser.full_name}</Text>
                    <Text style={styles.personEmail}>{targetUser.email}</Text>
                    <View style={[styles.statusBadge, targetUser.is_active ? styles.statusResolved : styles.statusPending, { marginTop: 6, alignSelf: 'flex-start' }]}>
                      <Text style={[styles.statusText, { color: targetUser.is_active ? '#10B981' : '#EF4444' }]}>
                        {targetUser.is_active ? 'Hoạt động' : 'Đã khóa'}
                      </Text>
                    </View>
                  </View>
                </View>

                {targetUser.is_active && (
                  <TouchableOpacity style={styles.dangerBtn} onPress={handleLockUser} disabled={processing}>
                    <Ionicons name="lock-closed-outline" size={16} color="#EF4444" />
                    <Text style={styles.dangerBtnText}>Khóa tài khoản này</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <Text style={styles.notFoundText}>Người dùng không tồn tại hoặc đã bị xóa</Text>
            )}
          </View>
        )}

        {/* Target post */}
        {report.target_type === 'post' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bài đăng bị báo cáo</Text>
            {targetPost ? (
              <>
                <TouchableOpacity
                  style={styles.postPreview}
                  onPress={() => router.push(`/post/${targetPost.post_id}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.postImageBox}>
                    {targetPost.media?.[0]?.file_url ? (
                      <Image source={{ uri: targetPost.media[0].file_url }} style={styles.avatarImg} />
                    ) : (
                      <Ionicons name="image-outline" size={24} color="#D1D5DB" />
                    )}
                  </View>
                  <View style={styles.personInfo}>
                    <Text style={styles.personName} numberOfLines={2}>{targetPost.title}</Text>
                    <Text style={styles.personEmail} numberOfLines={1}>
                      {targetPost.room?.owner?.full_name ?? 'Ẩn danh'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.dangerBtn} onPress={handleDeletePost} disabled={processing}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.dangerBtnText}>Xóa bài đăng này</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.notFoundText}>Bài đăng không tồn tại hoặc đã bị xóa</Text>
            )}
          </View>
        )}

        {/* Mark resolved */}
        {report.status !== 'resolved' && (
          <View style={[styles.section, { paddingBottom: 32 }]}>
            <TouchableOpacity style={styles.resolveBtn} onPress={handleMarkResolved} disabled={processing}>
              {processing
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="checkmark-outline" size={18} color="#fff" />
                    <Text style={styles.resolveBtnText}>Đánh dấu đã xử lý</Text>
                  </>}
            </TouchableOpacity>
          </View>
        )}
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 12 },

  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 8,
  },
  typeBadgeText: { fontSize: 13, fontWeight: '700' },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statusPending: { backgroundColor: '#FFFBEB' },
  statusResolved: { backgroundColor: '#ECFDF5' },
  statusText: { fontSize: 12, fontWeight: '700' },

  reasonBox: {
    fontSize: 14, color: '#374151', lineHeight: 22,
    backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14,
  },

  personCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  personAvatar: {
    width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
    backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  personAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  personInfo: { flex: 1 },
  personName: { fontSize: 14, fontWeight: '700', color: '#111' },
  personEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  timeText: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  postPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 10,
  },
  postImageBox: {
    width: 50, height: 50, borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },

  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2',
    borderRadius: 12, padding: 12,
  },
  dangerBtnText: { fontSize: 14, color: '#EF4444', fontWeight: '700' },

  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#10B981', borderRadius: 14, padding: 16,
  },
  resolveBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },

  notFoundText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
});