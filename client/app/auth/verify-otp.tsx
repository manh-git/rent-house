import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { verifyOTP, resendOTP } from '@/store/authStore';
import { useGlobalSearchParams,useRouter } from 'expo-router';
export default function OTPVerifyScreen() {
  const { userId, email } = useGlobalSearchParams<{ userId: string; email: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<TextInput[]>([]);
  const router = useRouter();
  // Đếm ngược resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length < 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 số!');
      return;
    }
    try {
      setLoading(true);
      await verifyOTP(Number(userId), otpString);
      console.log("Xác nhận OTP thành công!");
      router.replace('/auth/login');
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'OTP không hợp lệ!');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendOTP(Number(userId), email);
      setCountdown(60);
      Alert.alert('Thành công', 'Đã gửi lại OTP!');
    } catch (err: any) {
      console.log("Bắt được lỗi resend, đang ép chuyển trang...",err);
      router.replace('/auth/login');

    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Xác Nhận Email</Text>
      <Text style={styles.subtitle}>Nhập mã 6 số đã gửi đến{'\n'}{email}</Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => { if (ref) inputs.current[index] = ref; }}
            style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
            value={digit}
            onChangeText={text => handleChange(text, index)}
            onKeyPress={e => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Xác Nhận</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
        <Text style={[styles.resend, countdown > 0 && styles.resendDisabled]}>
          {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#4F46E5' },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32, lineHeight: 22 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  otpInput: {
    width: 48, height: 56, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, fontSize: 24, fontWeight: 'bold', color: '#111',
  },
  otpInputFilled: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  button: { backgroundColor: '#4F46E5', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resend: { textAlign: 'center', color: '#4F46E5', fontSize: 14 },
  resendDisabled: { color: '#9CA3AF' },
});