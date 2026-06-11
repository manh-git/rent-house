import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getNotificationsAPI, markAllReadAPI, markOneReadAPI } from '@/store/notification.service';
import { connectSocket } from '@/utils/socket';

interface Notification {
  notif_id: number;
  type: string;
  title: string;
  body: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

const NOTIF_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  contract_invite:  { icon: 'document-text-outline', color: '#4F46E5', bg: '#EEF2FF' },
  contract_signed:  { icon: 'checkmark-circle-outline', color: '#10B981', bg: '#ECFDF5' },
  deposit_received: { icon: 'cash-outline', color: '#F59E0B', bg: '#FFFBEB' },
  message:          { icon: 'chatbubble-outline', color: '#3B82F6', bg: '#EFF6FF' },
  default:          { icon: 'notifications-outline', color: '#6B7280', bg: '#F3F4F6' },
};

function NotifItem({ item, onPress }: { item: Notification; onPress: () => void }) {
  const style = NOTIF_ICONS[item.type] ?? NOTIF_ICONS.default;

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60_000) return 'Vừa xong';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`;
    return `${Math.floor(diff / 86_400_000)} ngày trước`;
  };

  return (
    <TouchableOpacity
      style={[styles.notifItem, !item.is_read && styles.notifUnread]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.notifIcon, { backgroundColor: style.bg }]}>
        <Ionicons name={style.icon as any} size={22} color={style.color} />
      </View>

      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.is_read && styles.notifTitleUnread]}>
          {item.title}
        </Text>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
      </View>

      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await getNotificationsAPI();
      setNotifications(res.data ?? []);
      setUnreadCount(res.unread ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchNotifs(); }, [fetchNotifs]));

  // Realtime notification
  useEffect(() => {
    let mounted = true;
    connectSocket().then(sock => {
      if (!mounted) return;
      sock.on('new_notification', (notif: Notification) => {
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(c => c + 1);
      });
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handlePress = async (item: Notification) => {
    
    if (!item.data.is_read) {
    await markOneReadAPI(item.notif_id);
    setNotifications(prev =>
      prev.map(n => n.notif_id === item.notif_id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(c => Math.max(0, c - 1));
  }


  let data = item.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = {}; }
  }

  console.log(data.contract_id);
    

  
    if (item.type === 'escrow_action_required' && data?.contract_id) {
    router.push({
      pathname: '/contract/submit',
      params: { contractId: data.contract_id },
    } as any);
    }else if (item.data?.contract_id) {
      router.push(`/contract/${item.data.contract_id}` as any);
    } else if (item.data?.conv_id) {
      router.push(`/message/${item.data.conv_id}` as any);
    } else if (item.data?.post_id) {
      router.push(`/post/${item.data.post_id}` as any);
    }

  };

  const handleMarkAll = async () => {
    await markAllReadAPI();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifs();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAll}>
            <Text style={styles.markAllBtn}>Đọc tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.notif_id.toString()}
          renderItem={({ item }) => (
            <NotifItem item={item} onPress={() => handlePress(item)} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? 48 : 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111' },
  markAllBtn: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
  },
  notifUnread: { backgroundColor: '#FAFAFA' },
  notifIcon: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 3 },
  notifTitleUnread: { color: '#111', fontWeight: '700' },
  notifBody: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, color: '#9CA3AF' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#4F46E5', marginTop: 4,
  },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});