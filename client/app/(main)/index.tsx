import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, RefreshControl, Modal, ScrollView, TextInput,
  ActivityIndicator, Pressable, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useRouter } from 'expo-router';
import { getPostsAPI, PostFilter } from '@/store/post.service';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/store/authStore';

// ── Types ────────────────────────────────────────────────────────
interface Post {
  post_id: number;
  title: string;
  content: string;
  room: {
    original_price: number;
    discount_price?: number;
    avg_rating?: number;
    features?: {
      area_size?: number;
      has_wifi: boolean;
      has_air_con: boolean;
      has_parking: boolean;
      bedrooms?: number;
    };
    address: {
      detail: string;
      ward: { ward_name: string };
    };
    is_rented: boolean;
    owner: {
    user_id: number;
    full_name: string;
    avatar_url: string | null;
    
  }
  };
  media: { file_url: string }[];
  created_at: string;
  
}

// ── Filter Modal ─────────────────────────────────────────────────
function FilterModal({
  visible, onClose, onApply,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (f: PostFilter) => void;
}) {
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [hasWifi, setHasWifi] = useState(false);
  const [hasAirCon, setHasAirCon] = useState(false);
  const [hasParking, setHasParking] = useState(false);

 const handleApply = () => {
  onApply({
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minArea: minArea ? Number(minArea) : undefined,
    maxArea: maxArea ? Number(maxArea) : undefined,
    hasWifi: hasWifi ? true : undefined,      
    hasAirCon: hasAirCon ? true : undefined,
    hasParking: hasParking ? true : undefined,
  });
  onClose();
};

  const handleReset = () => {
    setMinPrice(''); setMaxPrice('');
    setMinArea(''); setMaxArea('');
    setHasWifi(false); setHasAirCon(false); setHasParking(false);
    onApply({});
    onClose();
  };
  

  const ToggleChip = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) => (
    <TouchableOpacity
      style={[styles.chip, value && styles.chipActive]}
      onPress={onToggle}
    >
      <Text style={[styles.chipText, value && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
    style={{ flex: 1 }} 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Bộ lọc tìm kiếm</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Giá */}
            <Text style={styles.filterLabel}>Giá thuê (VNĐ/tháng)</Text>
            <View style={styles.rangeRow}>
              <TextInput style={styles.rangeInput} placeholder="Từ" keyboardType="numeric"
                value={minPrice} onChangeText={setMinPrice} />
              <Text style={styles.rangeSep}>—</Text>
              <TextInput style={styles.rangeInput} placeholder="Đến" keyboardType="numeric"
                value={maxPrice} onChangeText={setMaxPrice} />
            </View>

            {/* Diện tích */}
            <Text style={styles.filterLabel}>Diện tích (m²)</Text>
            <View style={styles.rangeRow}>
              <TextInput style={styles.rangeInput} placeholder="Từ" keyboardType="numeric"
                value={minArea} onChangeText={setMinArea} />
              <Text style={styles.rangeSep}>—</Text>
              <TextInput style={styles.rangeInput} placeholder="Đến" keyboardType="numeric"
                value={maxArea} onChangeText={setMaxArea} />
            </View>

            {/* Tiện ích */}
            <Text style={styles.filterLabel}>Tiện ích</Text>
            <View style={styles.chipRow}>
              <ToggleChip label="📶 Wifi" value={hasWifi} onToggle={() => setHasWifi(v => !v)} />
              <ToggleChip label="❄️ Điều hoà" value={hasAirCon} onToggle={() => setHasAirCon(v => !v)} />
              <ToggleChip label="🅿️ Chỗ đậu xe" value={hasParking} onToggle={() => setHasParking(v => !v)} />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Đặt lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Post Card ────────────────────────────────────────────────────
function PostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const imageUrl = post.media?.[0]?.file_url;
  const features = post.room?.features;
  const price = post.room?.discount_price ?? post.room?.original_price;
  const address = `${post.room?.address?.detail}, ${post.room?.address?.ward?.ward_name}`;

  const formatPrice = (p: number) =>
    p >= 1_000_000 ? `${(p / 1_000_000).toFixed(1)}tr` : `${p.toLocaleString()}đ`;

  const getRelativeTime = (isoString: string) => {
  const now = new Date();
  const created = new Date(isoString);
  const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
};
const owner = post.room?.owner || post.room.owner;
  const ownerId = owner?.user_id;

  const isRented = post.room?.is_rented;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      {/* Ảnh */}
      
      <View style={styles.headerRow}>
        <TouchableOpacity
        
        style={styles.ownerInfo} 
        onPress={() => {
      router.push(`/profile/${ownerId}` as any);
    }}>
          <View style={styles.avatar}>
            {owner.avatar_url ? (
              <Image source={{ uri: owner.avatar_url }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={styles.avatarText}>{post.room.owner?.full_name?.charAt(0) || 'U'}</Text>
            )}
          </View>
          <View>
            <Text style={styles.ownerName}>{post.room.owner?.full_name || 'Người dùng'}</Text>
            <Text style={styles.timeText}>{getRelativeTime(post.created_at)}</Text>
          </View>
          </TouchableOpacity>
          {isRented && (
            
      <View style={styles.rentedDot} >
      <Text>Đã cho thuê</Text>
      </View>
    )}
      </View>
      
      <View style={styles.cardImageBox}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="image-outline" size={32} color="#D1D5DB" />
          </View>
        )}
        
      </View>

      {/* Nội dung */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{post.title}</Text>

        <Text style={styles.cardPrice}>{formatPrice(price ?? 0)}<Text style={styles.cardPriceUnit}>/tháng</Text></Text>

        <View style={styles.cardMeta}>
          {features?.area_size && (
            <View style={styles.metaItem}>
              <Ionicons name="expand-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>{Number(features.area_size)}m²</Text>
            </View>
          )}
          {features?.has_wifi && (
            <View style={styles.metaItem}>
              <Ionicons name="wifi-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>Wifi</Text>
            </View>
          )}
          {features?.has_air_con && (
            <View style={styles.metaItem}>
              <Ionicons name="snow-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>Điều hoà</Text>
            </View>
          )}
          {features?.has_parking && (
            <View style={styles.metaItem}>
              <Ionicons name="car-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>Đậu xe</Text>
            </View>
          )}
        </View>

        <View style={styles.cardAddress}>
          <Ionicons name="location-outline" size={13} color="#9CA3AF" />
          <Text style={styles.cardAddressText} numberOfLines={1}>{address}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Home Screen ──────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const user = useAuth()
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<PostFilter>({});
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false);
const fetchPosts = useCallback(async (filter: PostFilter = {}, pageNum = 1, reset = false) => {
  if (isLoadingRef.current) return;
  try {
    isLoadingRef.current = true;
    if (pageNum === 1) setLoading(true); 

    const limitCount = 10;
    const startIndex = (pageNum - 1) * limitCount;

    const apiParams = {
      ...filter,
      search: searchText || undefined, // Truyền text tìm kiếm nếu có
      index: startIndex,
      count: limitCount
    };

    const res = await getPostsAPI(apiParams);
    const newPosts = res.data ?? [];
    
    setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
    setHasMore(newPosts.length === limitCount);
    setPage(pageNum);
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
    isLoadingRef.current = false; 
  }
}, [searchText]); 
  useFocusEffect(useCallback(() => {
    fetchPosts(activeFilter, 1, true);
  }, []));

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts(activeFilter, 1, true);
    setRefreshing(false);
    
  };

  const handleFilterApply = (filter: PostFilter) => {
    setActiveFilter(filter);
    fetchPosts(filter, 1, true);
  };

  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    fetchPosts(activeFilter, page + 1);
  };
useEffect(() => {
  const delayDebounceFn = setTimeout(() => {
    fetchPosts(activeFilter, 1, true);
  }, 500);

  return () => clearTimeout(delayDebounceFn);
}, [searchText]);

  const hasActiveFilter = Object.values(activeFilter).some(v => v !== undefined);

  return (
    
<View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <FlatList
        data={posts}
        keyExtractor={item => item.post_id.toString()}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => router.push(`/post/${item.post_id}` as any)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 16 }} color="#4F46E5" /> : null}
        ListHeaderComponent={
          <View>
            {/* ── Thanh tìm kiếm + lọc ── */}
            <View style={styles.searchSection}>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.searchBarInput}
                  placeholder="Tìm kiếm phòng trọ..."
                  placeholderTextColor="#9CA3AF"
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </View>
              <TouchableOpacity
                style={[styles.filterBtn, hasActiveFilter && styles.filterBtnActive]}
                onPress={() => setFilterVisible(true)}
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={hasActiveFilter ? '#fff' : '#4F46E5'}
                />
                {hasActiveFilter && <View style={styles.filterDot} />}
              </TouchableOpacity>
            </View>

            {/* ── Nút đăng bài ── */}
            {(user.user?.role === 2)? (
              
            <TouchableOpacity
              style={styles.postNewBtn}
              onPress={() => router.push('/post/create' as any)}
              activeOpacity={0.85}
            >
                
              <View style={styles.postNewLeft}>
                <View style={styles.postNewAvatar}>
                  <Ionicons name="person" size={16} color="#fff" />
                </View>
                <Text style={styles.postNewText}>Bạn muốn đăng phòng cho thuê?</Text>
              </View>
              <View style={styles.postNewRight}>
                <Ionicons name="add-circle" size={22} color="#4F46E5" />
              </View>
              
               </TouchableOpacity>
            ):null}
           

            <Text style={styles.sectionTitle}>
              Tin đăng mới nhất {hasActiveFilter && <Text style={styles.filteringLabel}>(đang lọc)</Text>}
            </Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Ionicons name="home-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không có bài đăng nào</Text>
            </View>
          ) : null
        }
      />

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleFilterApply}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },

  // Search + Filter
  searchSection: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchBarInput: { flex: 1, fontSize: 14, color: '#111', padding: 0 },
  filterBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#4F46E5' },
  filterDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444',
  },

  // Post New Button
  postNewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 12, padding: 12,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  postNewLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postNewAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center',
  },
  postNewText: { fontSize: 14, color: '#6B7280' },
  postNewRight: {},

  rentedDot: {
    position: 'absolute',
    bottom: 16,
    right: 5,
    fontWeight:'bold',
    color: '#fd0505'
  },
  // Section
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', paddingHorizontal: 16, marginBottom: 8 },
  filteringLabel: { fontSize: 13, fontWeight: '400', color: '#4F46E5' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16,
    marginBottom: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardImageBox: { position: 'relative', height: 180 },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  discountBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  discountText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 6 },
  cardPrice: { fontSize: 18, fontWeight: '800', color: '#4F46E5', marginBottom: 8 },
  cardPriceUnit: { fontSize: 13, fontWeight: '400', color: '#6B7280' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: '#6B7280' },
  cardAddress: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardAddressText: { fontSize: 12, color: '#9CA3AF', flex: 1 },

  // Filter Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 20 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10, marginTop: 16 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rangeInput: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 10, fontSize: 14, color: '#111',
  },
  rangeSep: { color: '#9CA3AF', fontSize: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  chipText: { fontSize: 13, color: '#6B7280' },
  chipTextActive: { color: '#4F46E5', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  resetBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, alignItems: 'center' },
  resetBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  applyBtn: { flex: 1, backgroundColor: '#4F46E5', borderRadius: 12, padding: 14, alignItems: 'center' },
  applyBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
  headerRow: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ownerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { 
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#d5e1f4', 
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden' 
  },
  avatarText: { fontWeight: 'bold', color: '#6B7280' },
  ownerName: { fontSize: 13, fontWeight: '600', color: '#111' },
  timeText: { fontSize: 11, color: '#9CA3AF' },
});