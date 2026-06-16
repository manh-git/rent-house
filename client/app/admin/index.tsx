import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/authStore';
import { getWithdrawalsAPI, getAdminLogsAPI, searchUsersAPI } from '@/store/admin.service';

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bg: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ users: 0, withdrawals: 0, logs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, withdrawalsRes, logsRes] = await Promise.all([
          searchUsersAPI('', 0, 1),
          getWithdrawalsAPI(),
          getAdminLogsAPI(0, 1),
        ]);
        setStats({
          users: usersRes.pagination?.total ?? 0,
          withdrawals: withdrawalsRes.data?.length ?? 0,
          logs: logsRes.pagination?.total ?? 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards: StatCard[] = [
    { label: 'Tổng người dùng', value: stats.users, icon: 'people-outline', color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Chờ rút tiền', value: stats.withdrawals, icon: 'cash-outline', color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Nhật ký hệ thống', value: stats.logs, icon: 'list-outline', color: '#10B981', bg: '#ECFDF5' },
  ];

  const menuItems = [
    { label: 'Quản lý người dùng', icon: 'people', route: '/admin/users', color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Quản lý bài đăng', icon: 'home', route: '/admin/posts', color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Yêu cầu rút tiền', icon: 'wallet', route: '/admin/withdrawals', color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Nhật ký hệ thống', icon: 'document-text', route: '/admin/logs', color: '#10B981', bg: '#ECFDF5' },
    { label: 'Quản lý tìm roommate', icon: 'pencil', route: '/admin/roommate', color: '#b910b6', bg: '#ECFDF5' },
    { label: 'Quản lý báo cáo', icon: 'book', route: '/admin/reports', color: '#b6b910', bg: '#ECFDF5' },

  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Xin chào,</Text>
          <Text style={styles.headerTitle}>{user?.name ?? 'Admin'} 👋</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color="#4F46E5" />
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
                <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
                  <Ionicons name={s.icon as any} size={22} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Menu */}
        <Text style={styles.sectionTitle}>Chức năng quản trị</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuCard, { backgroundColor: item.bg }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <Text style={[styles.menuLabel, { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#4F46E5',
    paddingTop: Platform.OS === 'android' ? 52 : 16,
  },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6,
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuCard: {
    width: '47%', borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 10,
  },
  menuIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});