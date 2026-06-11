import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, RefreshControl, SafeAreaView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/store/authStore';
import { getListConvAPI } from '@/store/chat.service';
import { connectSocket, subscribeStatus, getCachedStatus } from '@/utils/socket';

interface OtherUser {
  user_id: number;
  full_name: string;
  avatar_url?: string;
  last_seen?: string;
}

interface Conversation {
  conv_id: number;
  user1_id: number;
  user2_id: number;
  last_message_at: string;
  user1: OtherUser;
  user2: OtherUser;
  messages: { message_text: string; sent_at: string; sender_id: number }[];
  // 💡 BỔ SUNG: Nhận trường dữ liệu đếm từ Prisma Backend
  _count?: {
    messages: number;
  };
}

// ─── CONV ITEM ────────────────────────────────────────────────────────────────

function ConvItem({
  conv,
  currentUserId,
  onPress,
}: {
  conv: Conversation;
  currentUserId: number;
  onPress: () => void;
}) {
  const other = conv.user1_id === currentUserId ? conv.user2 : conv.user1;
  const lastMsg = conv.messages?.[0];
  const isMe = lastMsg?.sender_id === currentUserId;
  
  // Lấy số lượng tin nhắn chưa đọc của riêng phòng này
  const unreadCount = conv._count?.messages ?? 0;

  const [isOnline, setIsOnline] = useState<boolean>(
    () => getCachedStatus(other.user_id) === 'online'
  );

  useEffect(() => {
    const unsub = subscribeStatus((userId, status) => {
      if (userId === other.user_id) setIsOnline(status === 'online');
    });
    return unsub;
  }, [other.user_id]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60_000) return 'Vừa xong';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ`;
    return `${Math.floor(diff / 86_400_000)} ngày`;
  };

  return (
    <TouchableOpacity style={styles.convItem} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.avatarBox}>
        {other.avatar_url ? (
          <Image source={{ uri: other.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{other.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <View style={[styles.onlineDot, !isOnline && styles.onlineDotOffline]} />
      </View>

      <View style={styles.convContent}>
        <View style={styles.convHeader}>
          {/* Chữ đậm lên nếu phòng có tin nhắn chưa xem */}
          <Text style={[styles.convName, unreadCount > 0 && styles.textUnread]} numberOfLines={1}>
            {other.full_name}
          </Text>
          {lastMsg && (
            <Text style={[styles.convTime, unreadCount > 0 && styles.timeUnread]}>
              {formatTime(lastMsg.sent_at)}
            </Text>
          )}
        </View>
        
        <View style={styles.convBodyRow}>
          {/* Nội dung tin nhắn chuyển đậm nếu chưa xem */}
          <Text style={[styles.convLastMsg, unreadCount > 0 && styles.msgUnread]} numberOfLines={1}>
            {lastMsg
              ? `${isMe ? 'Bạn: ' : ''}${lastMsg.message_text ?? '[Hình ảnh]'}`
              : 'Bắt đầu cuộc trò chuyện'}
          </Text>

          {/* 💡 BỔ SUNG: Hiển thị chấm tròn đỏ đếm số tin nhắn chưa xem của phòng */}
          {unreadCount > 0 && (
            <View style={styles.itemBadge}>
              <Text style={styles.itemBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function MessageListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await getListConvAPI();
      setConversations(res.data ?? []);
    } catch (e) {
      console.error('Lỗi fetch danh sách hội thoại:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  // 💡 SỬA LỖI LẮNG NGHE REAL-TIME: Thêm cổng nghe 'receive_notification'
  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    connectSocket().then((sock) => {
      if (!mounted) return;

      const onNewMessage = () => {
        console.log("🔄 [List Screen] Phát hiện tin nhắn mới hệ thống -> Tự động cập nhật danh sách...");
        fetchConversations();
      };

      // Đăng ký toàn bộ các cổng nhận diện tin nhắn (Bao gồm cả thông báo ngầm từ user khác)
      sock.on('receive_message', onNewMessage);
      sock.on('message_sent', onNewMessage);
      sock.on('receive_notification', onNewMessage); // 🔥 QUAN TRỌNG: Sửa lỗi mất preview khi ở ngoài phòng

      cleanup = () => {
        sock.off('receive_message', onNewMessage);
        sock.off('message_sent', onNewMessage);
        sock.off('receive_notification', onNewMessage);
      };
    }).catch(() => {});

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [fetchConversations]);

  // Kiểm tra trạng thái online/offline của mọi đối phương trong list
  useEffect(() => {
    if (conversations.length === 0) return;

    connectSocket().then((sock) => {
      conversations.forEach((conv) => {
        const otherId =
          conv.user1_id === (user?.id ?? 0) ? conv.user2_id : conv.user1_id;
        sock.emit('check_user_status', { targetUserId: otherId });
      });
    }).catch(() => {});
  }, [conversations.length, user?.id]); // FIX: Tránh loop vô tận bằng cách chỉ theo dõi độ dài length

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.conv_id.toString()}
          renderItem={({ item }) => {
            const currentUserId = user?.id ?? 0;
            const otherUser = item.user1_id === currentUserId ? item.user2 : item.user1;
            return (
              <ConvItem
                conv={item}
                currentUserId={currentUserId}
                onPress={() =>
                  router.push({
                    pathname: `/message/${item.conv_id}`,
                    params: {
                      receiverId: otherUser.user_id.toString(),
                      receiverName: otherUser.full_name,
                      receiverAvatar: otherUser.avatar_url ?? '',
                    },
                  })
                }
              />
            );
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubbles-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? 48 : 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  convItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  avatarBox: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff',
  },
  onlineDotOffline: { backgroundColor: '#D1D5DB' },
  convContent: { flex: 1 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '600', color: '#111', flex: 1 },
  textUnread: { fontWeight: '800', color: '#000' }, // Tên đậm khi chưa đọc
  convTime: { fontSize: 12, color: '#9CA3AF' },
  timeUnread: { color: '#4F46E5', fontWeight: '600' },
  convBodyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  convLastMsg: { fontSize: 13, color: '#6B7280', flex: 1 },
  msgUnread: { color: '#111', fontWeight: '700' }, // Tin nhắn đậm khi chưa đọc
  
  // Style cho cục Badge đếm số lượng tin nhắn chưa đọc của phòng
  itemBadge: {
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  itemBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  separator: { height: 1, backgroundColor: '#F9FAFB', marginLeft: 80 },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});