import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/store/authStore';
import { StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { connectSocket, disconnectSocket } from '@/utils/socket'; // IMPORT 2 HÀM NÀY
import { ReportFAB } from '@/components/ReportFAB';
export default function RootLayout() {
  const { isLoggedIn, checkAuth, getUserInfor, user } = useAuth(); // Lấy thêm object user ra nếu cần
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [isMounted, setIsMounted] = useState(false);
  const [isCheckingDB, setIsCheckingDB] = useState(false); 

  // 1. Kiểm tra Token cục bộ ngay khi ứng dụng khởi chạy
  useEffect(() => {
    const initAuth = async () => {
      setIsMounted(true);
      await checkAuth();
    };
    initAuth();
  }, [checkAuth]);

  // 2. Xác thực sâu người dùng với Database 
  useEffect(() => {
    const verifyUserWithDB = async () => {
      if (isLoggedIn) {
        try {
          setIsCheckingDB(true);
          await getUserInfor(); 
        } catch (e) {
          console.log("User không hợp lệ dưới DB, Interceptor sẽ tự động xử lý logout.");
        } finally {
          setIsCheckingDB(false);
        }
      }
    };
    verifyUserWithDB();
  }, [isLoggedIn, getUserInfor]);

  // ── 💡 ĐOẠN THÊM MỚI: QUẢN LÝ SOCKET TOÀN CỤC CHUẨN XÁC ──────────────────
  useEffect(() => {
    // Nếu trạng thái là ĐÃ ĐĂNG NHẬP và ĐÃ CHECK XONG DATABASE (có thông tin user)
    if (isLoggedIn && !isCheckingDB) {
      console.log("[RootLayout] Đã đăng nhập xong xuôi -> Kích hoạt Socket lập tức!");
      connectSocket().catch((err) => {
        console.error("[RootLayout] Lỗi kết nối socket tự động:", err.message);
      });
    } 
    
    // Nếu trạng thái biến thành ĐÃ ĐĂNG XUẤT (isLoggedIn = false)
    if (!isLoggedIn) {
      console.log("[RootLayout] Trạng thái Đăng xuất / Chưa đăng nhập -> Chủ động hủy Socket ngầm.");
      disconnectSocket();
    }
  }, [isLoggedIn, isCheckingDB]); // Theo dõi sát sao trạng thái Login và tiến trình Check DB
  // ─────────────────────────────────────────────────────────────────────

  const isAdmin = user && (user.role === 3 || user.role === 5);

  // 3. Quản lý việc Điều hướng (Guard Routes)
useEffect(() => {
  if (!isMounted || !navigationState?.key || isCheckingDB) return;

  const inAuthGroup = segments[0] === 'auth';
  const inAdminGroup = segments[0] === 'admin'; // Sửa lại: vì folder bạn là 'admin'
  const isPostDetail = segments[1] === 'post';
  const timeout = setTimeout(() => {
    if (!isLoggedIn ) {
      if(!inAuthGroup)
      router.replace('/auth/login');
    } 
    else {
      if ( inAuthGroup) {
      router.replace('/');
    }
    else if (isAdmin) {
      if (segments.length === 0 || (!inAdminGroup && !isPostDetail)) {
          router.replace('/admin');
        }
    }
    else if (inAdminGroup && !isAdmin) {
      router.replace('/');
    }}
  }, 0);

  return () => clearTimeout(timeout);
}, [isLoggedIn, segments, isAdmin, isCheckingDB]); // isAdmin là hằng số hoặc biến nhớ
  if (!isMounted || !navigationState?.key) {
    return null; 
  }
  
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      // keyboardVerticalOffset giúp tránh trường hợp bị che mất header hoặc phần trên cùng
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} 
    >
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#f4511e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerShown: false,
      }}
    >
      <Stack.Screen name="(man)/index" options={{ title: 'Trang Chủ', headerShown: true }} />
      <Stack.Screen name="auth/verify-otp" />
      <Stack.Screen name="auth/login" options={{ title: 'Đăng nhập' }} />
      <Stack.Screen name="auth/register" options={{ title: 'Đăng ký' }} />
      <Stack.Screen name="profile/update-infor" options={{ title: 'Thay đổi thông tin' }} />
      <Stack.Screen name="admin" />
      
    </Stack>
    {isLoggedIn && !isAdmin && <ReportFAB />}
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});