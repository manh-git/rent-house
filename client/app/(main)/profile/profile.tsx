import React, {  useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
 ActivityIndicator, Image,
  SafeAreaView, 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth, API } from '@/store/authStore';
import { PostCard } from '@/components/PostCars';
import { RoommateList } from '@/components/Roommate';
import { getUserPostsListAPI, getUserRoommateListAPI } from '@/store/profile.service';
import { getWardAPI } from '@/store/post.service';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Contract {
  contract_id: number;
  status: string;
  escrow_status: string;
  monthly_rent: string | number;
  start_date: string;
  end_date: string;
  room?: { room_id: number; address?: { detail: string } };
  tenant?: { user_id: number; full_name: string; avatar_url?: string };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#FAECE7', text: '#4A1B0C' },
];
const getAvatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
const getInitials = (name: string) => name?.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() ?? '?';
const formatMoney = (val: string | number) => {
  const n = Number(val);
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.0', '')}triệu` : `${n.toLocaleString('vi-VN')}đ`;
};
const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const CONTRACT_STATUS: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  active:    { label: 'Đang hiệu lực', bg: '#E1F5EE', text: '#085041', border: '#9FE1CB', icon: 'checkmark-circle-outline' },
  signed:    { label: 'Đã ký',          bg: '#E1F5EE', text: '#085041', border: '#9FE1CB', icon: 'checkmark-circle-outline' },
  pending:   { label: 'Chờ xác nhận',   bg: '#FAEEDA', text: '#633806', border: '#FAC775', icon: 'time-outline' },
  cancel:    { label: 'Đã hủy',         bg: '#FCEBEB', text: '#791F1F', border: '#F7C1C1', icon: 'close-circle-outline' },
  expired:   { label: 'Hết hạn',        bg: '#F1EFE8', text: '#5F5E5A', border: '#D3D1C7', icon: 'calendar-outline' },
};

function ContractCard({ contract, isOwner }: { contract: Contract; isOwner: boolean }) {
  const status = CONTRACT_STATUS[contract.status] || CONTRACT_STATUS.pending;
  const otherPerson = isOwner ? contract.tenant : undefined;
  const fullAddress = contract.room?.address?.detail || 'Địa chỉ không xác định';
  return (
    <View style={styles.contractCard}>
      <View style={[styles.contractIcon, { backgroundColor: status.bg }]}>
        <Ionicons name={status.icon} size={18} color={status.text} />
      </View>
      <View style={styles.contractBody}>
        <Text style={styles.contractTitle} numberOfLines={1}>
          {fullAddress}
          {otherPerson ? ` – ${otherPerson.full_name}` : ''}
        </Text>
        <Text style={styles.contractSub}>{formatDate(contract.start_date)} → {formatDate(contract.end_date)}</Text>
      </View>
      <Text style={styles.contractPrice}>{formatMoney(contract.monthly_rent)}</Text>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { user, getUserInfor } = useAuth();
  const isOwner = user?.role === 2;

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [posts, setPosts] = useState([]); // Cho chủ trọ
  const [roommates, setRoommates] = useState([]); // Cho người thuê
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Hợp đồng
      const contractRes = await API.get('/contract/my-list').catch(() => ({ data: [] }));
      const rawData = contractRes.data?.data; 
      const contractList = rawData?.all || []; // Lấy mảng 'all'
      
      setContracts(contractList);

      // 2. Fetch Bài đăng/Ở ghép
      if (isOwner) {
        const pRes = await getUserPostsListAPI(user?.id);
        setPosts(pRes.data || []);
      } else {
        const rRes = await getUserRoommateListAPI(user?.id);
        setRoommates(Array.isArray(rRes.data) ? rRes.data : (rRes.data?.list || []));
        const wRes = await getWardAPI();
        setWards(wRes.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isOwner, user?.id]);

  useFocusEffect(useCallback(() => {
    getUserInfor();
    fetchData();
  }, [fetchData]));

  const avatarColor = getAvatarColor(user?.name ?? 'U');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCardWrap}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
  {user?.avatarUrl ? (
    <Image 
      source={{ uri: user.avatarUrl }} 
      style={{ width: '100%', height: '100%', borderRadius: 32 }} 
    />
  ) : (
    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: avatarColor.bg }]}>
      <Text style={[styles.avatarText, { color: avatarColor.text }]}>
        {getInitials(user?.name ?? 'U')}
      </Text>
    </View>
  )}
</View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name ?? 'Người dùng'}</Text>
              <Text style={styles.roleTagText}>{isOwner ? 'Chủ trọ' : 'Người thuê'}</Text>
            </View>
          </View>
        </View>

        {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
          <View style={styles.section}>
            {/* Contracts Section */}
            <Text style={styles.secTitle}>Hợp đồng gần đây</Text>
{(Array.isArray(contracts) ? contracts : []).slice(0, 3).map(c => (
  <TouchableOpacity 
    key={c.contract_id} 
    onPress={() => router.push(`/contract/${c.contract_id}` as any)}
  >
    <ContractCard contract={c} isOwner={isOwner} />
  </TouchableOpacity>
))}
{(!Array.isArray(contracts) || contracts.length === 0) && (
  <Text style={styles.emptyText}>Chưa có hợp đồng nào</Text>
)}

            {/* Posts Section */}
            <Text style={[styles.secTitle, { marginTop: 20 }]}>{isOwner ? 'Bài đăng của tôi' : 'Bài ở ghép của tôi'}</Text>
            {isOwner ? (
              posts.map((item: any) => (
                <PostCard key={item.post_id} post={item} onPress={() => router.push(`/post/${item.post_id}` as any)} />
              ))
            ) : (
              <RoommateList data={roommates} currentUserId={user?.id} onRefresh={fetchData} wards={wards} />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1EFE8' },
  profileCardWrap: { paddingHorizontal: 14, marginTop: 10 },
  profileCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '500' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '500' },
  roleTagText: { fontSize: 11, color: '#3C3489' },
  section: { marginTop: 14, paddingHorizontal: 14 },
  secTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  contractCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 10, marginBottom: 8, borderWidth: 0.5, borderColor: '#D3D1C7' },
  contractIcon: { width: 36, height: 36, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  contractBody: { flex: 1 },
  contractTitle: { fontSize: 13, fontWeight: '500' },
  contractSub: { fontSize: 11, color: '#888780' },
  contractPrice: { fontSize: 13, fontWeight: '500', color: '#3C3489' },
});