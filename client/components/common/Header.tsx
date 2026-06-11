import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform, Modal, Pressable, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/authStore';
import { disconnectSocket } from '@/utils/socket';

interface HeaderProps {
  onSearch?: (text: string) => void;
  showSearch?: boolean;
}

export function AppHeader({ onSearch, showSearch = true }: HeaderProps) {
  const [ showMenu, setShowMenu] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false)
  ;
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () =>{
    setShowMenu(false);
    disconnectSocket();
    await logout();
    router.replace('/auth/login')
  }
  const handleSearch = (text: string) => {
    setSearchText(text);
    onSearch?.(text);
  };

  const handleClear = () => {
    setSearchText('');
    onSearch?.('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* ── Brand ─────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.brand}
          onPress={() => router.push('/')}
          activeOpacity={0.8}
        >
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>T</Text>
          </View>
          {!isFocused && (
            <Text style={styles.appName}>TroApp</Text>
          )}
        </TouchableOpacity>

        {/* ── Search ────────────────────────────────────────── */}
        {showSearch && (
          <View style={[styles.searchBox, isFocused && styles.searchBoxFocused]}>
            <Ionicons
              name="search-outline"
              size={16}
              color={isFocused ? '#4F46E5' : '#9CA3AF'}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm phòng trọ..."
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={handleSearch}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Avatar ────────────────────────────────────────── */}
        {!isFocused && (
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => setShowMenu(true)}
            activeOpacity={0.8}
          >
            {user?.avatarUrl ? (
              <Image 
                  source={{ uri: user?.avatarUrl }} 
                  style={{ width: '100%', height: '100%' }} 
    />
            ) : (
              <View style={styles.avatarFallbackBox}>
                <Text style={styles.avatarFallback}>
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

      </View>
      <Modal
        visible = {showMenu}
        transparent = {true}
        animationType='fade'
        onRequestClose={()=> setShowMenu(false)}
        >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            
            {/* Nút Thay đổi thông tin */}
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setShowMenu(false);
                router.push('/profile/update-infor'); // <-- Nhảy đến link của bạn
              }}
            >
              <Ionicons name="person-outline" size={18} color="#374151" />
              <Text style={styles.menuText}>Thay đổi thông tin</Text>
            </TouchableOpacity>

            {/* Đường gạch ngang phân cách */}
            <View style={styles.menuDivider} />

            {/* Nút Đăng xuất */}
            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemLogout]} 
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={[styles.menuText, styles.textLogout]}>Đăng xuất</Text>
            </TouchableOpacity>

          </View>
        </Pressable>

      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#4F46E5',
    paddingTop: Platform.OS === 'android' ? 36 : 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },

  // ── Brand ───────────────────────────────────────────────────────
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4F46E5',
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // ── Search ──────────────────────────────────────────────────────
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  searchBoxFocused: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111',
    padding: 0,
  },

  // ── Avatar ──────────────────────────────────────────────────────
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#818CF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#818CF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallback: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // ── Menu Modal Styles ──────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // Làm tối nền phía sau
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 70, // Đẩy menu xuống dưới Header một chút
    paddingHorizontal: 16,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5, // Đổ bóng cho Android
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  menuItemLogout: {
    backgroundColor: '#FEF2F2', // Đổi nền nhẹ cho nút đăng xuất nổi bật
  },
  menuText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  textLogout: {
    color: '#EF4444',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
});