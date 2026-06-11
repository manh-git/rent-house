// app/(admin)/_layout.tsx
import {  Stack } from 'expo-router';

export default function AdminLayout() {
  

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="logs" />
      <Stack.Screen name="posts" />
      <Stack.Screen name="users" />
      <Stack.Screen name="withdrawals" />
    </Stack>
  ) // Cho phép vào nếu là admin
}
