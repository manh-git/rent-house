import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { login, loginWithGoogle, useAuth } from '@/store/authStore';
import { useRouter } from 'expo-router';
import GoogleSignInButton from '../../components/GoogleSignInButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const router = useRouter();

  const handleRegister = ()=>{
    router.push('/auth/register')
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    try {
      setLoading(true);
      const response = await login(email, password);
      if(response.accessToken){
        useAuth.getState().setLogin(response.accessToken);
      }
      const userState = useAuth.getState();
      const user = userState.user;
      if(user?.role === 4){
        router.replace('/profile/update-infor'); 
      }
      else if(user?.role === 3 || user?.role ===5){
        router.replace('/admin');
      }
      else router.replace('/(main)'); 
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại!';
      if (msg.includes('xác nhận email')) {
        router.push({
          pathname: '/auth/verify-otp', 
          params: { userId: err.response?.data?.userId, email }
        });
      } else {
        Alert.alert('Lỗi', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (idToken: string) => {
    try {
      setGoogleLoading(true);
      await loginWithGoogle(idToken);
      setTimeout(() => {
      const user = useAuth.getState().user;
      console.log("Tiến hành điều hướng cho role:", user?.role);
      
      if (user?.role === 4) {
        router.replace('/profile/update-infor');
      } else {
        router.replace('/');
      }
    }, 100);
    } catch (e) {
      Alert.alert('Lỗi', 'Đăng nhập với server thất bại');
      console.log("Lỗi vì:",e);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Đăng Nhập</Text>

      <TextInput style={styles.input} placeholder="Email"
        value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none" />

      <TextInput style={styles.input} placeholder="Mật khẩu"
        value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
        <Text style={styles.forgot}>Quên mật khẩu?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng Nhập</Text>}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>hoặc</Text>
        <View style={styles.divider} />
      </View>

      {/*<GoogleSignInButton 
        onSuccess={handleGoogleSuccess} 
        onError={() => Alert.alert('Lỗi', 'Google Sign-in thất bại')}
        loading={googleLoading}
      />*/}

      <TouchableOpacity onPress={handleRegister}>
        <Text style={styles.link}>Chưa có tài khoản? Đăng ký</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 32, color: '#4F46E5' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 16 },
  forgot: { textAlign: 'right', color: '#4F46E5', marginBottom: 24, fontSize: 14 },
  button: { backgroundColor: '#4F46E5', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  divider: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#6B7280', fontSize: 14 },
  googleButton: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 24, backgroundColor: '#F9FAFB',
  },
  googleText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  link: { textAlign: 'center', color: '#4F46E5', fontSize: 14 },
});