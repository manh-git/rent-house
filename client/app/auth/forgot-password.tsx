import React, {useState} from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { forgotPass } from "@/store/authStore";
import { useRouter } from "expo-router";

export default function ForgotPassword(){
    const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email!');
      return;
    }

    try {
      setLoading(true);
      const res = await forgotPass({ email: email.trim() });
      
      Alert.alert('Thông báo', res.message || 'Vui lòng kiểm tra email của bạn.', [
        { text: 'OK'} 
      ]);

    router.push('/auth/reset-password')  
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gửi yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Quên mật khẩu?</Text>
        <Text style={styles.subtitle}>
          Nhập email của bạn, chúng tôi sẽ gửi mã xác nhận để đặt lại mật khẩu.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="example@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSendEmail}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gửi yêu cầu</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Quay lại đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, justifyContent: 'center', flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#4F46E5', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  login: { textAlign: 'right', color: '#4F46E5', marginBottom: 24, fontSize: 14 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 16, fontSize: 16, marginBottom: 24, color: '#111',
  },
  button: {
    backgroundColor: '#4F46E5', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#A5B4FC' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backButton: { marginTop: 24, alignItems: 'center' },
  backText: { color: '#4F46E5', fontWeight: '500' },
});