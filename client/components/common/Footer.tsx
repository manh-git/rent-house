import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/store/authStore';
import { connectSocket } from '@/utils/socket'; 
import { getUnreadCountAPI } from '@/store/chat.service';

interface FooterProps {
  notificationCount?: number;
  messageCount?: number; // Giá trị khởi tạo mặc định ban đầu từ màn hình cha (nếu có)
}

const TAB_ITEMS = [
  { name: 'index',                icon: 'home-outline',         iconActive: 'home',               label: 'Trang chủ', route: '/' },
  { name: 'message/list',        icon: 'chatbubble-outline',   iconActive: 'chatbubble',        label: 'Nhắn tin',  route: '/message/list' },
  { name: 'roommate/list',      icon: 'people-outline',       iconActive: 'people',            label: 'Ở ghép',    route: '/roommate/list' },
  { name: 'notification/index', icon: 'notifications-outline',iconActive: 'notifications',      label: 'Thông báo', route: '/notification' },
  { name: 'profile/profile',       icon: 'person-outline',       iconActive: 'person',            label: 'Cá nhân',   route: '/profile/profile' },
];

export function AppFooter({ notificationCount = 0, messageCount = 0 }: FooterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // State quản lý số lượng tin nhắn chưa đọc để nhảy số Real-time ngay tại Footer
  const [liveMessageCount, setLiveMessageCount] = useState(messageCount);
  const socketRef = useRef<any>(null);
  
  // Dùng Ref lưu pathname nhằm tránh scope của Socket bị đóng băng (Stale Closure)
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Hàm gọi API đồng bộ con số unread chuẩn xác nhất từ Prisma DB
  const refreshUnreadCount = async () => {
    const userId = user?.id || user?.user_id;
    if (!userId) return;
    try {
      const res = await getUnreadCountAPI();
      if (res && res.code === 1000) {
        setLiveMessageCount(res.data);
      }
    } catch (err) {
      console.error("Lỗi lấy tổng số tin nhắn chưa đọc tại Footer:", err);
    }
  };

  // 1. Đồng bộ state khi props từ ngoài cha có thay đổi đột biến
  useEffect(() => {
    setLiveMessageCount(messageCount);
  }, [messageCount]);

  // 2. Tự động đồng bộ lại từ DB bất cứ khi nào người dùng chuyển đổi qua lại giữa các tab
  useEffect(() => {
    const userId = user?.id || user?.user_id;
    if (userId) {
      refreshUnreadCount();
    }
  }, [user?.id, pathname]);

  // 3. 🔌 KẾT HỢP SOCKET: Lắng nghe và tự động đẩy số nhảy lập tức khi có tin nhắn đến
  useEffect(() => {
    const userId = user?.id || user?.user_id;
    
    if (!userId) return;
    
    let isMounted = true;

    const initFooterSocket = async () => {
      try {
        const sock = await connectSocket();
        if (!isMounted || !sock) return;
        socketRef.current = sock;

        // Xóa sạch sự kiện cũ để tránh lặp bộ lắng nghe (gây nhân đôi số badge)
        sock.off('receive_notification');
        
        sock.on('receive_notification', (msg: any) => {
          if (!isMounted) return;

          
          const incomingSenderId = Number(msg?.sender_id || msg?.senderId);
          const currentUserId = Number(user?.id || user?.user_id);

          // Nếu tin nhắn do chính mình gửi đi thì bỏ qua
          if (incomingSenderId === currentUserId) return;

          // Kiểm tra xem người dùng có đang ở trong màn hình chat chi tiết hay không
          const isInsideChatDetail = pathnameRef.current.includes('/message/detail');

          if (!isInsideChatDetail) {
            console.log("🔥 Đang ở ngoài màn chat -> Tăng tạm thời UI và đồng bộ hóa DB!");
            
            // Bước 1: Cho state nhảy số lập tức hiển thị lên màn hình (Optimistic Update)
            setLiveMessageCount(prev => prev + 1);

            // Bước 2: Gọi API cập nhật sau 600ms để đợi DB ghi nhận xong dữ liệu ổn định
            setTimeout(() => {
              if (isMounted) refreshUnreadCount();
            }, 600);
          }
        });

      } catch (error) {
        console.error("[Footer Socket Error]:", error);
      }
    };

    initFooterSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.off('receive_notification');
      }
    };
  }, [user?.id]); // Chỉ chạy lại chu kỳ socket khi User ID thực sự thay đổi

  // Logic kiểm tra Tab Active
  const isActive = (route: string) => {
    if (route === '/') return pathname === '/';
    return pathname.startsWith(route);
  };

  // Hàm map số lượng Badge tương ứng lên từng ô Tab chân trang
  const getBadge = (route: string) => {
    if (route === '/notification') return notificationCount;
    if (route === '/message/list') return liveMessageCount; // Sử dụng state liveMessageCount đã được đồng bộ
    return 0;
  };

  // Phân quyền hiển thị Tab Ở ghép
  const visibleTabItems = TAB_ITEMS.filter(tab => {
    if (tab.route === '/roommate/list') {
    if (user?.role=== 2) {
      return false;
    }
  }
    return true; 
  });

  return (
    <SafeAreaView style={styles.footerSafe}>
      <View style={styles.footerContainer}>
        {visibleTabItems.map((tab) => {
          const active = isActive(tab.route);
          const badge = getBadge(tab.route);

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => router.push(tab.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={(active ? tab.iconActive : tab.icon) as any}
                  size={24}
                  color={active ? '#4F46E5' : '#9CA3AF'}
                />
                {badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {badge > 99 ? '99+' : badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footerSafe: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  footerContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
});