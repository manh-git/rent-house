import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { changePass, useAuth } from '@/store/authStore';
import { uploadImageToCloudinary } from '@/utils/upload';
import { useRouter } from 'expo-router';

const ROLES = [
  { id: 2, label: 'Người cho thuê' },
  { id: 1, label: 'Người đi thuê' },
];

export default function EditProfileScreen() {
  const { user, getUserInfor, updateUserInfor, clearSession } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newPass, setNewPass ] = useState('');
  const [confirmPass, setConfirmPass]= useState('');
  const [loadingPass, setLoadingPass] = useState(false);

  useEffect(() => {
    getUserInfor();
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setPhone(user.phoneNumber || '');
      setAvatarUrl(user.avatarUrl || null);
      setSelectedRole(user.role || null);
    }
  }, [user]);

  // ─── CHỌN ẢNH ───────────────────────────────────────────────────────
const handlePickImage = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Platform.OS === 'web' 
      ? alert('Cần quyền truy cập thư viện ảnh!') 
      : Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh!');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 0.8,
  });

  if (!result.canceled) {
    try {
      setUploadingAvatar(true);
      const uri = result.assets[0].uri;
      
      // SỬA Ở ĐÂY: Chỉ truyền uri (chuỗi) vào hàm, đừng tạo object hay blob
      const url = await uploadImageToCloudinary(uri); 
      
      setAvatarUrl(url);
    } catch (error) {
      console.error(error);
      Platform.OS === 'web' 
        ? alert('Upload ảnh thất bại!') 
        : Alert.alert('Lỗi', 'Upload ảnh thất bại!');
    } finally {
      setUploadingAvatar(false);
    }
  }
};
  // ─── LƯU THÔNG TIN ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!fullName.trim()) {
      if (Platform.OS === 'web') {
        alert('Họ tên không được để trống!');
      } else {
        Alert.alert('Lỗi', 'Họ tên không được để trống!');
      }
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        avatar_url: avatarUrl,
      };

      if (user?.role === 4) {
        payload.role_id = selectedRole;
      }

      await updateUserInfor(payload);

      if (user?.role === 4 && selectedRole !== 4) {
        // ─── TRƯỜNG HỢP 1: ĐỔI VAI TRÒ (BẮT ĐĂNG NHẬP LẠI) ───────────────────
        if (Platform.OS === 'web') {
          await clearSession();
          alert('Vai trò thay đổi. Vui lòng đăng nhập lại để cập nhật quyền hạn!');
          router.replace('/auth/login');
        } else {
          Alert.alert(
            'Thông báo', 
            'Vai trò thay đổi. Vui lòng đăng nhập lại để cập nhật quyền hạn!', 
            [{ 
              text: 'OK', 
              onPress: async () => {
                await clearSession();
                router.replace('/auth/login');
              } 
            }]
          );
        }
      } else {
        // ─── TRƯỜNG HỢP 2: CẬP NHẬT THÀNH CÔNG BÌNH THƯỜNG ─────────────────
        if (Platform.OS === 'web') {
          alert('Cập nhật thông tin thành công!');
          router.back();
        } else {
          Alert.alert(
            'Thành công', 
            'Cập nhật thông tin thành công!', 
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Cập nhật thất bại!';
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('Lỗi', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlechangePass = async () => {
    const triggerAlert = (title: string, msg: string) => {
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert(title, msg);
      }
    };

    if (!newPass || !confirmPass) {
      triggerAlert('Lỗi', 'Vui lòng nhập đầy đủ thông tin mật khẩu!');
      return;
    }
    if (newPass !== confirmPass) {
      triggerAlert('Lỗi', 'Mật khẩu xác nhận không khớp!');
      return;
    }
    if (newPass.length < 6) {
      triggerAlert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    try {
      setLoadingPass(true);
      await changePass({ newPassword: newPass });
      triggerAlert('Thành công', 'Đổi mật khẩu thành công!');
      setNewPass('');
      setConfirmPass('');
    } catch (e: any) {
      console.log(e);
      triggerAlert('Lỗi', e?.response?.data?.message || 'Không thể đổi mật khẩu');
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Chỉnh sửa hồ sơ</Text>

      {/* ─── AVATAR ─────────────────────────────────────────────────── */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickImage} disabled={uploadingAvatar}>
          {uploadingAvatar ? (
            <View style={styles.avatarPlaceholder}>
              <ActivityIndicator color="#4F46E5" />
            </View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {fullName ? fullName[0]?.toUpperCase() : '?'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePickImage} disabled={uploadingAvatar}>
          <Text style={styles.changeAvatarText}>
            {uploadingAvatar ? 'Đang tải lên...' : 'Thay đổi ảnh đại diện'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── HỌ TÊN ─────────────────────────────────────────────────── */}
      <Text style={styles.label}>Họ và tên</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
      />

      {/* ─── SỐ ĐIỆN THOẠI ──────────────────────────────────────────── */}
      <Text style={styles.label}>Số điện thoại</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Nhập số điện thoại"
        keyboardType="phone-pad"
      />

      {/* ─── ROLE (chỉ hiện nếu role = 4) ──────────────────────────── */}
      {user?.role === 4 && (
        <View>
          <Text style={styles.label}>Vai trò</Text>
          <View style={styles.roleContainer}>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleButton,
                  selectedRole === role.id && styles.roleButtonActive,
                ]}
                onPress={() => setSelectedRole(role.id)}
              >
                <Text style={[
                  styles.roleText,
                  selectedRole === role.id && styles.roleTextActive,
                ]}>
                  {role.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ─── THÔNG TIN ROLE HIỆN TẠI (không phải admin) ────────────── */}
      {user?.role !== 4 && (
        <View style={styles.roleInfo}>
          <Text style={styles.label}>Vai trò hiện tại</Text>
          <View style={styles.roleInfoBadge}>
            <Text style={styles.roleInfoText}>
              {ROLES.find(r => r.id === user?.role)?.label || 'Không xác định'}
            </Text>
          </View>
          <Text style={styles.roleHint}>Liên hệ admin để thay đổi vai trò</Text>
        </View>
      )}

      {/* ─── NÚT LƯU ────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading || uploadingAvatar}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveButtonText}>Lưu thay đổi</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Hủy</Text>
      </TouchableOpacity>

      {/* ─── ĐỔI MẬT KHẨU ───────────────────────────────────────────── */}
      <View style={styles.changePassSection}>
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Đổi mật khẩu</Text>

        <Text style={styles.label}>Mật khẩu mới</Text>
        <TextInput
          style={styles.input}
          value={newPass}
          onChangeText={setNewPass}
          placeholder="Nhập mật khẩu mới"
          secureTextEntry
        />

        <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
        <TextInput
          style={styles.input}
          value={confirmPass}
          onChangeText={setConfirmPass}
          placeholder="Xác nhận lại mật khẩu"
          secureTextEntry
        />

        <TouchableOpacity 
          style={[styles.changePassButton, loadingPass && styles.saveButtonDisabled]} 
          onPress={handlechangePass}
          disabled={loadingPass}
        >
          {loadingPass ? (
            <ActivityIndicator color="#4F46E5" />
          ) : (
            <Text style={styles.changePassButtonText}>Cập nhật mật khẩu</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#4F46E5', marginBottom: 32 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarPlaceholderText: { fontSize: 36, fontWeight: 'bold', color: '#4F46E5' },
  changeAvatarText: { color: '#4F46E5', fontSize: 14, fontWeight: '500' },

  // Form
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 20, color: '#111',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 32,
  },
  changePassSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 20,
  },
  changePassButton: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  changePassButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  // Role selector (admin only)
  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleButton: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  roleButtonActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  roleText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  roleTextActive: { color: '#4F46E5', fontWeight: '700' },

  // Role info (non-admin)
  roleInfo: { marginBottom: 24 },
  roleInfoBadge: {
    backgroundColor: '#F3F4F6', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start',
    marginBottom: 6,
  },
  roleInfoText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  roleHint: { fontSize: 12, color: '#9CA3AF' },

  // Buttons
  saveButton: {
    backgroundColor: '#4F46E5', borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  saveButtonDisabled: { backgroundColor: '#A5B4FC' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { padding: 16, alignItems: 'center' },
  cancelText: { color: '#6B7280', fontSize: 16 },
});