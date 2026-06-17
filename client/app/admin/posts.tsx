import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform, ActivityIndicator,
  Alert, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { deletePostAPI } from '@/store/admin.service';
import { API } from '@/store/authStore';
interface Post {
  post_id: number;
  title: string;
  content?: string;
  created_at: string;
  room: {
    room_id: number;
    original_price: number;
    discount_price?: number;
    owner: { user_id: number; full_name: string; email: string };
    address: { detail: string; ward: { ward_name: string } };
    features?: { area_size?: number };
  };
  media: { file_url: string }[];
}

const getPostsAdminAPI = async (key = '', page = 0, limit = 10) => {
  const res = await API.get('/post_room/getlistpost', {
    params: {
      search: key, 
      index: page,  
      count: limit, 
    },
  });
  return res.data;
};

export default function AdminPostsScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchKey, setSearchKey] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (key = '', pageNum = 0, reset = false) => {
    try {
      setLoading(true);
      const res = await getPostsAdminAPI(key, pageNum, 10);
      const data: Post[] = res.data ?? [];
      setPosts(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === 10);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { fetchPosts('', 0, true); }, []);

  const handleSearch = (text: string) => {
    setSearchKey(text);
    fetchPosts(text, 0, true);
  };

  const handleDelete = (post: Post) => {
    Alert.alert(
      '🗑️ Xóa bài đăng',
      `Bạn chắc chắn muốn xóa bài:\n"${post.title}"?\n\nHành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa', style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Lý do xóa',
              'Nhập lý do xóa bài đăng này:',
              async (reason) => {
                if (!reason?.trim()) {
                  Alert.alert('Lỗi', 'Vui lòng nhập lý do!');
                  return;
                }
                try {
                  await deletePostAPI(post.post_id, post.room.room_id, reason);
                  Alert.alert('✅ Thành công', 'Đã xóa bài đăng!');
                  fetchPosts(searchKey, 0, true);
                } catch (err: any) {
                  Alert.alert('Lỗi', err?.response?.data?.message || 'Xóa thất bại!');
                }
              },
              'plain-text',
              'Vi phạm điều khoản sử dụng'
            );
          },
        },
      ]
    );
  };

  const formatPrice = (p: number) =>
    p >= 1_000_000 ? `${(p / 1_000_000).toFixed(1)}tr` : `${p.toLocaleString()}đ`;

  const renderPost = ({ item }: { item: Post }) => {
    const imageUrl = item.media?.[0]?.file_url;
    const price = item.room?.discount_price ?? item.room?.original_price;
    const address = `${item.room?.address?.detail}, ${item.room?.address?.ward?.ward_name}`;

    return (
      <View style={styles.postCard}>
        {/* Ảnh */}
        <View style={styles.imageBox}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={28} color="#D1D5DB" />
            </View>
          )}
          <View style={styles.priceTag}>
            <Text style={styles.priceTagText}>{formatPrice(Number(price))}/th</Text>
          </View>
        </View>

        {/* Nội dung */}
        <View style={styles.postContent}>
          <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
            <Text style={styles.metaText} numberOfLines={1}>{address}</Text>
          </View>

          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>
                {item.room?.owner?.full_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>{item.room?.owner?.full_name}</Text>
              <Text style={styles.ownerEmail} numberOfLines={1}>{item.room?.owner?.email}</Text>
            </View>
          </View>

          <View style={styles.postFooter}>
            <Text style={styles.postDate}>
              {new Date(item.created_at).toLocaleDateString('vi-VN')}
            </Text>
            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.viewBtn}
                onPress={() => router.push(`/post/${item.post_id}` as any)}
              >
                <Ionicons name="eye-outline" size={16} color="#4F46E5" />
                <Text style={styles.viewBtnText}>Xem</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý bài đăng</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tiêu đề, địa chỉ..."
          value={searchKey}
          onChangeText={handleSearch}
          placeholderTextColor="#9CA3AF"
        />
        {searchKey.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {posts.length} bài đăng{searchKey ? ` cho "${searchKey}"` : ''}
        </Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.post_id.toString()}
        renderItem={renderPost}
        contentContainerStyle={{ padding: 16, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPosts(searchKey, 0, true); }}
          />
        }
        onEndReached={() => { if (hasMore && !loading) fetchPosts(searchKey, page + 1); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading && posts.length > 0
            ? <ActivityIndicator color="#4F46E5" style={{ padding: 16 }} />
            : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Ionicons name="home-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không có bài đăng nào</Text>
              {searchKey.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <Text style={styles.clearSearch}>Xóa tìm kiếm</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 60 }} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? 48 : 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111', padding: 0 },

  statsBar: {
    paddingHorizontal: 16, paddingBottom: 8,
  },
  statsText: { fontSize: 13, color: '#9CA3AF' },

  // Post Card
  postCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  imageBox: { position: 'relative', height: 160 },
  postImage: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  priceTag: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: '#4F46E5', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  priceTagText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  postContent: { padding: 14 },
  postTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  metaText: { flex: 1, fontSize: 12, color: '#9CA3AF' },

  ownerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, marginBottom: 12,
  },
  ownerAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center',
  },
  ownerAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  ownerInfo: { flex: 1 },
  ownerName: { fontSize: 13, fontWeight: '600', color: '#111' },
  ownerEmail: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  postFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  postDate: { fontSize: 11, color: '#9CA3AF' },
  postActions: { flexDirection: 'row', gap: 8 },

  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EEF2FF', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  viewBtnText: { fontSize: 13, color: '#4F46E5', fontWeight: '600' },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEF2F2', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  deleteBtnText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
  clearSearch: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },
});