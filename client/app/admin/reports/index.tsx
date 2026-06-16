import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getListReportsAPI } from '@/store/admin.service';

interface Report {
  report_id: number;
  sender_id: number;
  target_type: string;
  target_id?: number;
  reason: string;
  status: string;
  updated_at: string;
  sender: { full_name: string; email: string };
}

const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  user: { icon: 'person-outline', color: '#3B82F6', bg: '#EFF6FF', label: 'Người dùng' },
  post: { icon: 'home-outline', color: '#F59E0B', bg: '#FFFBEB', label: 'Bài đăng' },
  app:  { icon: 'bug-outline', color: '#EF4444', bg: '#FEF2F2', label: 'Lỗi app' },
};

const FILTERS = [
  { label: 'Tất cả', value: undefined },
  { label: 'Chờ xử lý', value: 'pending' },
  { label: 'Đã xử lý', value: 'resolved' },
];

export default function AdminReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchReports = useCallback(async (status?: string, pageNum = 0, reset = false) => {
    try {
      setLoading(true);
      const res = await getListReportsAPI(pageNum, 15, status);
      const data: Report[] = res.data ?? [];
      setReports(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === 15);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { fetchReports(filter, 0, true); }, [filter]);

  const formatTime = (d: string) => new Date(d).toLocaleString('vi-VN');

  const renderReport = ({ item }: { item: Report }) => {
    const typeInfo = TYPE_ICONS[item.target_type] ?? TYPE_ICONS.app;
    const isResolved = item.status === 'resolved';

    return (
      <TouchableOpacity
        style={[styles.card, isResolved && styles.cardResolved]}
        onPress={() => router.push({ pathname: '/admin/reports/[reportId]', params: { reportId: item.report_id } } as any)}
        activeOpacity={0.85}
      >
        <View style={[styles.typeIcon, { backgroundColor: typeInfo.bg }]}>
          <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.typeLabel, { color: typeInfo.color }]}>{typeInfo.label}</Text>
            {!isResolved && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.reasonText} numberOfLines={2}>{item.reason}</Text>
          <View style={styles.senderRow}>
            <Ionicons name="person-circle-outline" size={13} color="#9CA3AF" />
            <Text style={styles.senderText} numberOfLines={1}>{item.sender?.full_name}</Text>
            <Text style={styles.timeText}>· {formatTime(item.updated_at)}</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Báo cáo</Text>
        <TouchableOpacity onPress={() => router.push('/admin/send' as any)}>
          <Ionicons name="megaphone-outline" size={22} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterBtn, filter === f.value && styles.filterBtnActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={reports}
        keyExtractor={item => item.report_id.toString()}
        renderItem={renderReport}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReports(filter, 0, true); }} />
        }
        onEndReached={() => { if (hasMore && !loading) fetchReports(filter, page + 1); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading ? <ActivityIndicator color="#4F46E5" style={{ padding: 16 }} /> : null}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-done-circle-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyText}>Không có báo cáo nào</Text>
          </View>
        ) : null}
      />
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

  filterRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8, backgroundColor: '#fff' },
  filterBtn: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  filterBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  filterText: { fontSize: 13, color: '#6B7280' },
  filterTextActive: { color: '#4F46E5', fontWeight: '700' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardResolved: { opacity: 0.6 },
  typeIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  typeLabel: { fontSize: 12, fontWeight: '700' },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EF4444' },
  reasonText: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 4 },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  senderText: { fontSize: 12, color: '#6B7280' },
  timeText: { fontSize: 11, color: '#9CA3AF' },

  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});