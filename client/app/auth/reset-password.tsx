import React, { useState } from 'react';
import {
  Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { resetPass } from '@/store/authStore';
import { useRouter } from 'expo-router';

export default function ResetPasswordScreen() {
  const [otp, setOtp] = useState('');
  const [ email , setEmail ] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    if (!otp || !newPassword || !confirmPassword ||!email) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các trường!');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      setLoading(true);
      const res = await resetPass({ otp: otp.trim(), newPass: newPassword , email: email});
      
      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi!', [
        { text: 'Đăng nhập ngay', onPress: () => router.push('/auth/login') }
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <Text style={styles.title}>Đặt lại mật khẩu</Text>
      <Text style={styles.subtitle}>Nhập mã xác nhận từ email và mật khẩu mới của bạn.</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Điền email của bạn vào đây"
      />
      <Text style={styles.label}>Mã xác nhận (OTP)</Text>
      <TextInput
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
        placeholder="Điền mã Otp của bạn vào đây"
      />

      <Text style={styles.label}>Mật khẩu mới</Text>
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Ít nhất 6 ký tự"
        secureTextEntry
      />

      <Text style={styles.label}>Xác nhận mật khẩu</Text>
      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Nhập lại mật khẩu mới"
        secureTextEntry
      />
      <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.login}>Quay lại đăng nhập</Text>
            </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cập nhật mật khẩu</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#4F46E5', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  login: { textAlign: 'right', color: '#4F46E5', marginBottom: 24, fontSize: 14 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 16, fontSize: 16, marginBottom: 20, color: '#111',
  },
  button: {
    backgroundColor: '#4F46E5', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10
  },
  buttonDisabled: { backgroundColor: '#A5B4FC' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});