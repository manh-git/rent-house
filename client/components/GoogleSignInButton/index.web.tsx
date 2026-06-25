import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

interface Props {
  onSuccess: (idToken: string) => void;
  onError: (error?: any) => void;
  loading?: boolean;
}

export default function GoogleSignInButton({ onSuccess, onError, loading }: Props) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '309568191271-egevp7ib9h1uel436i3cp6liek6ju1c8.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      if (idToken) onSuccess(idToken);
      else onError('Không lấy được id_token');
    } else if (response?.type === 'error') {
      onError(response.error);
    }
  }, [response]);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => promptAsync()}
      disabled={!request || loading}
    >
      {loading
        ? <ActivityIndicator color="#374151" />
        : <Text style={styles.text}>🔵 Đăng nhập với Google</Text>}
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