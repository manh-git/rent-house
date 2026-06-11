import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  };
  media: { file_url: string }[];
  created_at: string;
  owner: {
    user_id: number;
    full_name: string;
    avatar_url: string | null;
  }
}
export function PostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  
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
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      {/* Ảnh */}
      
      <View style={styles.headerRow}>
        <View style={styles.ownerInfo}>
          <View style={styles.avatar}>
            {post.owner?.avatar_url ? (
              <Image source={{ uri: post.room?.owner?.avatar_url }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={styles.avatarText}>{post.room?.owner?.full_name?.charAt(0) || 'U'}</Text>
            )}
          </View>
          <View>
            <Text style={styles.ownerName}>{post.room?.owner?.full_name || 'Người dùng'}</Text>
            <Text style={styles.timeText}>{getRelativeTime(post.created_at)}</Text>
          </View>
        </View>
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
const styles = StyleSheet.create({

   

  

  
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