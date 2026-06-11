import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '309568191271-egevp7ib9h1uel436i3cp6liek6ju1c8.apps.googleusercontent.com',
});

interface Props {
  onSuccess: (idToken: string) => void;
  onError: (error?: any) => void;
  loading?: boolean;
}

export default function GoogleSignInButton({ onSuccess, onError, loading }: Props) {
  const handlePress = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('Không lấy được idToken');
      onSuccess(idToken);
    } catch (error) {
      onError(error);
      console.log(error)
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} disabled={loading}>
      {loading
        ? <ActivityIndicator color="#374151" />
        : <Text style={styles.text}>🔵  Đăng nhập với Google</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 16, alignItems: 'center', backgroundColor: '#F9FAFB', marginBottom: 24,
  },
  text: { fontSize: 16, color: '#374151', fontWeight: '500' },
});