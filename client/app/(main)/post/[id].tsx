import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Dimensions,
  SafeAreaView, Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/authStore';
import { getPostDetailAPI, deletePostAPI } from '@/store/post.service';
import { OSMMapView } from '@/components/OSMMapView';
import { getFindRoom } from '@/store/chat.service';
const { width } = Dimensions.get('window');

const AMENITY_LIST = [
  { key: 'has_wifi',    label: 'Wifi',       icon: 'wifi-outline' },
  { key: 'has_air_con', label: 'Điều hoà',   icon: 'snow-outline' },
  { key: 'has_parking', label: 'Đậu xe',     icon: 'car-outline' },
  { key: 'furnished',   label: 'Nội thất',   icon: 'bed-outline' },
  { key: 'has_balcony', label: 'Ban công',   icon: 'leaf-outline' },
];

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const fetchPost = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPostDetailAPI(Number(id));
      setPost(res.data);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải bài đăng!');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleStartChat = async () => {
    try {
      const ownerId = post?.room?.owner_id;
      const ownerName = post?.room?.owner?.full_name ?? 'Ẩn danh';
      const ownerAvatar = post?.room?.owner?.avatar_url ?? '';

      if (!ownerId) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin chủ phòng!');
        return;
      }

      // 1. Gọi API check phòng cũ dựa vào ID chủ phòng
      const res = await getFindRoom(Number(ownerId));
      
      // Backend trả về cấu trúc { code: 1000, data: convId hoặc null }
      const existingConvId = res.data; 

      // 2. Chuyển hướng sang màn ChatScreen (Khớp chuẩn param cấu trúc router của bạn)
      router.push({
        pathname: `/message/${existingConvId ? existingConvId : 'new'}`,
        params: {
          id: existingConvId ? String(existingConvId) : '', 
          receiverId: String(ownerId),
          receiverName: ownerName,
          receiverAvatar: ownerAvatar,
        }
      });
    } catch (error) {
      console.error('Không thể điều hướng sang phòng chat:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ chat!');
    }
  };
  useEffect(() => { fetchPost(); }, [fetchPost]);


const handleDelete = () => {
  const roomId = post?.room?.room_id || post?.room_id;
  
  if (!roomId) {
    if (Platform.OS === 'web') {
      window.alert('Lỗi: Không tìm thấy mã phòng (Room ID)!');
    } else {
      Alert.alert('Lỗi', 'Không tìm thấy mã phòng (Room ID)!');
    }
    return;
  }

  // Khai báo hàm thực hiện logic xóa để dùng chung cho cả Web và Mobile
  const executeDelete = async () => {
    try {
      setDeleting(true);
      await deletePostAPI(Number(roomId));
      
      if (Platform.OS === 'web') {
        window.alert('Đã xóa bài đăng thành công!');
        router.replace('/');
      } else {
        Alert.alert('Thành công', 'Đã xóa bài đăng!', [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Xóa thất bại!';
      if (Platform.OS === 'web') {
        window.alert(`Lỗi: ${errorMsg}`);
      } else {
        Alert.alert('Lỗi', errorMsg);
      }
    } finally {
      setDeleting(false);
    }
  };

  // ── Xử lý hiển thị hộp thoại xác nhận theo từng Nền tảng ──
  if (Platform.OS === 'web') {
    // Trên Web: Sử dụng confirm của trình duyệt (Trả về true nếu chọn OK/Xóa, false nếu chọn Hủy)
    const confirmDelete = window.confirm('Bạn có chắc muốn xóa bài đăng này không?');
    if (confirmDelete) {
      executeDelete();
    }
  } else {
    // Trên Mobile: Giữ nguyên Alert native mượt mà
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa bài đăng này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: executeDelete },
      ]
    );
  }
};
  const formatPrice = (p: number) =>
    p >= 1_000_000 ? `${(p / 1_000_000).toFixed(1)} triệu` : `${p.toLocaleString()}đ`;

  const isOwner = 
  user?.id && 
  post?.room?.owner_id && 
  String(user.id) === String(post.room.owner_id);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!post) return null;

  const images = post.media ?? [];
  const features = post.room?.features ?? {};
  const address = post.room?.address;
  const price = post.room?.discount_price ?? post.room?.original_price;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ───────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>{post.title}</Text>

        {/* Nút sửa/xóa — chỉ hiện cho chủ bài */}
        {isOwner && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, styles.editBtn]}
              
              onPress={() => {
                const roomId = post?.room?.room_id || post?.room_id;

                router.push({
                  pathname: `/contract/create`,
                  params: {
                  room_id: String(roomId),
                  address: post?.room?.address?.detail || 'Địa chỉ không xác định',
                  monthly_rent: String(post?.room?.discount_price ?? post?.room?.original_price ?? 0)
                }
                });
              }}
            >
              <Ionicons name="medical-outline" size={20} color="#4F46E5" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, styles.editBtn]}
              onPress={() => {
                 const roomId = post?.room?.room_id || post?.room_id;
                 router.push(`/post/edit/${id}?room_id=${roomId}`);
              }}
            >
              <Ionicons name="create-outline" size={20} color="#4F46E5" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, styles.deleteBtn]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator size="small" color="#EF4444" />
                : <Ionicons name="trash-outline" size={20} color="#EF4444" />}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Ảnh ──────────────────────────────────────────── */}
        <View style={styles.imageSection}>
          {images.length > 0 ? (
            <>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => i.toString()}
                onMomentumScrollEnd={e => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / width);
                  setActiveImage(index);
                }}
                renderItem={({ item }) => (
                  <Image source={{ uri: item.file_url }} style={styles.image} resizeMode="cover" />
                )}
              />
              {/* Dots */}
              {images.length > 1 && (
                <View style={styles.dots}>
                  {images.map((_: any, i: number) => (
                    <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={48} color="#D1D5DB" />
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* ── Giá + Tiêu đề ────────────────────────────── */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(price ?? 0)}<Text style={styles.priceUnit}>/tháng</Text></Text>
          </View>
          <Text style={styles.title}>{post.title}</Text>

          {/* ── Thông số ─────────────────────────────────── */}
          <View style={styles.statsRow}>
            {features.area_size && (
              <View style={styles.statItem}>
                <Ionicons name="expand-outline" size={18} color="#4F46E5" />
                <Text style={styles.statValue}>{Number(features.area_size)}m²</Text>
                <Text style={styles.statLabel}>Diện tích</Text>
              </View>
            )}
            {features.bedrooms && (
              <View style={styles.statItem}>
                <Ionicons name="bed-outline" size={18} color="#4F46E5" />
                <Text style={styles.statValue}>{features.bedrooms}</Text>
                <Text style={styles.statLabel}>Phòng ngủ</Text>
              </View>
            )}
            {features.bathrooms && (
              <View style={styles.statItem}>
                <Ionicons name="water-outline" size={18} color="#4F46E5" />
                <Text style={styles.statValue}>{features.bathrooms}</Text>
                <Text style={styles.statLabel}>WC</Text>
              </View>
            )}
          </View>

          {/* ── Tiện ích ─────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tiện ích</Text>
            <View style={styles.amenityGrid}>
              {AMENITY_LIST.map(a => {
                const active = features[a.key];
                return (
                  <View key={a.key} style={[styles.amenityItem, !active && styles.amenityInactive]}>
                    <Ionicons name={a.icon as any} size={20} color={active ? '#4F46E5' : '#D1D5DB'} />
                    <Text style={[styles.amenityText, !active && styles.amenityTextInactive]}>
                      {a.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Mô tả ────────────────────────────────────── */}
          {post.content && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mô tả</Text>
              <Text style={styles.description}>{post.content}</Text>
            </View>
          )}

          {/* ── Địa chỉ + Bản đồ ─────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Địa chỉ</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color="#4F46E5" />
              <Text style={styles.addressText}>
                {address?.detail}, {address?.ward?.ward_name}
              </Text>
            </View>
            {address?.lat && address?.lng && (
              <View style={{ marginTop: 12 }}>
                <OSMMapView
                  lat={Number(address.lat)}
                  lng={Number(address.lng)}
                  height={200}
                />
              </View>
            )}
          </View>

          {/* ── Thông tin chủ phòng ───────────────────────── */}
          <View style={styles.card}>
            <TouchableOpacity
                    
                    style={styles.ownerInfo} 
                    onPress={() => {
                  router.push(`/profile/${post.room?.owner?.user_id}` as any);
                }}>
            <Text style={styles.cardTitle}>Chủ phòng</Text>
            <View style={styles.ownerRow}>
              <View style={styles.ownerAvatar}>
                {post.room?.owner?.avatar_url ? (
                  <Image source={{ uri: post.room.owner.avatar_url }} style={styles.ownerAvatarImg} />
                ) : (
                  <Text style={styles.ownerAvatarText}>
                    {post.room?.owner?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                )}
              </View>
              
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{post.room?.owner?.full_name ?? 'Ẩn danh'}</Text>
                {post.room?.owner?.phone && (
                  <Text style={styles.ownerPhone}>{post.room.owner.phone}</Text>
                )}
              </View>
              {!isOwner && (
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={handleStartChat}
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                  <Text style={styles.chatBtnText}>Nhắn tin</Text>
                </TouchableOpacity>
              )}
            </View>
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? 48 : 12,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111' },
  headerActions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#EEF2FF' },
  deleteBtn: { backgroundColor: '#FEF2F2' },

  // Images
  imageSection: { backgroundColor: '#fff' },
  image: { width, height: 280 },
  imagePlaceholder: { height: 280, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  dotActive: { width: 18, backgroundColor: '#4F46E5' },

  content: { padding: 16 },

  // Price
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  price: { fontSize: 24, fontWeight: '800', color: '#4F46E5' },
  priceUnit: { fontSize: 14, fontWeight: '400', color: '#6B7280' },
  discountBadge: { backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  discountText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 16 },

  // Stats
  statsRow: {
    flexDirection: 'row', gap: 12, marginBottom: 16,
    backgroundColor: '#EEF2FF', borderRadius: 14, padding: 16,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111' },
  statLabel: { fontSize: 11, color: '#6B7280' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
    shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 14 },

  // Amenities
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  amenityInactive: { backgroundColor: '#F9FAFB' },
  amenityText: { fontSize: 13, color: '#4F46E5', fontWeight: '500' },
  amenityTextInactive: { color: '#D1D5DB' },

  // Description
  description: { fontSize: 14, color: '#374151', lineHeight: 22 },

  // Address
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addressText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },

  // Owner
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ownerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  ownerAvatarImg: { 
    width: '100%', height: '100%' },
  ownerAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  ownerInfo: { flex: 1 },
  ownerName: { fontSize: 15, fontWeight: '600', color: '#111' },
  ownerPhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  chatBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});