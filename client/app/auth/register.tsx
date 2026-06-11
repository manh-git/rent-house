import React, { useState } from 'react';
import {
 Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { register } from '@/store/authStore';
import { useRouter } from 'expo-router';
export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmPass, setConfirmPass]= useState('');
  const router = useRouter();

  const handleLogin = ()=>{
    router.push('/auth/login');
  }
  const handleRegister = async () => {
    if (!email || !password || !fullName || !confirmPass) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    if(password !== confirmPass){
      Alert.alert('Lỗi', 'Vui lòng kiểm tra lại mật khẩu!');
      return;
    }
    
    try {
      setLoading(true);
      const res = await register(email, password, fullName);
      router.push({
        pathname: '/auth/verify-otp', 
        params: { userId: res.userId, email: email }
      });
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Đăng kí thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Đăng Ký</Text>

      <TextInput style={styles.input} placeholder="Họ và tên"
        value={fullName} onChangeText={setFullName} />

      <TextInput style={styles.input} placeholder="Email"
        value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none" />

      <TextInput style={styles.input} placeholder="Mật khẩu"
        value={password} onChangeText={setPassword} secureTextEntry />

      <TextInput style={styles.input} placeholder="Xác nhận mật khẩu"
       onChangeText={setConfirmPass} secureTextEntry />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng Ký</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress = {handleLogin}>
        <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 32, color: '#4F46E5' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#4F46E5', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', color: '#4F46E5', fontSize: 14 },
});