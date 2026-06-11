import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAdminLogsAPI } from '@/store/admin.service';

interface Log {
  log_id: number;
  action_type: string;
  action_details?: string;
  target_id?: number;
  created_at: string;
  admin: { user_id: number; full_name: string };
}

export default function AdminLogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchKey, setSearchKey] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = useCallback(async (key = '', pageNum = 0, reset = false) => {
    try {
      setLoading(true);
      const res = await getAdminLogsAPI(pageNum, 20, key);
      const data = res.data ?? [];
      setLogs(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === 20);
      setPage(pageNum);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchLogs('', 0, true); }, []);

  const formatTime = (d: string) => new Date(d).toLocaleString('vi-VN');

  const renderLog = ({ item }: { item: Log }) => (
    <View style={styles.logCard}>
      <View style={styles.logDot} />
      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <Text style={styles.logAction}>{item.action_type}</Text>
          <Text style={styles.logTime}>{formatTime(item.created_at)}</Text>
        </View>
        {item.action_details && (
          <Text style={styles.logDetail} numberOfLines={2}>{item.action_details}</Text>
        )}
        <Text style={styles.logAdmin}>
          <Ionicons name="person-outline" size={11} /> {item.admin?.full_name ?? 'Admin'}
          {item.target_id ? ` · ID: ${item.target_id}` : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhật ký hệ thống</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo loại hành động..."
          value={searchKey}
          onChangeText={text => { setSearchKey(text); fetchLogs(text, 0, true); }}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item.log_id.toString()}
        renderItem={renderLog}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLogs(searchKey, 0, true); }} />}
        onEndReached={() => { if (hasMore && !loading) fetchLogs(searchKey, page + 1); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading ? <ActivityIndicator color="#4F46E5" style={{ padding: 16 }} /> : null}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có nhật ký nào</Text>
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
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111', padding: 0 },
  logCard: {
    flexDirection: 'row', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  logDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#4F46E5', marginTop: 4,
  },
  logContent: { flex: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logAction: { fontSize: 14, fontWeight: '700', color: '#111', flex: 1 },
  logTime: { fontSize: 11, color: '#9CA3AF' },
  logDetail: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 4 },
  logAdmin: { fontSize: 11, color: '#9CA3AF' },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});