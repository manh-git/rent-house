import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator,
  SafeAreaView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/store/authStore';
import { getPostDetailAPI, updatePostAPI } from '@/store/post.service';
import { uploadImageToCloudinary } from '@/utils/upload';
import { AddressSearch } from '@/components/AddressSearch';

// 🌟 IMPORT THƯ VIỆN CHUYÊN DỤNG TRỊ CHE BÀN PHÍM
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AMENITIES = [
  { key: 'has_wifi',    label: '📶 Wifi' },
  { key: 'has_air_con', label: '❄️ Điều hoà' },
  { key: 'has_parking', label: '🅿️ Đậu xe' },
  { key: 'furnished',   label: '🛋️ Nội thất' },
  { key: 'has_balcony', label: '🌿 Ban công' },
];

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [roomId, setRoomId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [areaSize, setAreaSize] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [amenities, setAmenities] = useState<Record<string, boolean>>({});
  const [images, setImages] = useState<string[]>([]);
  const [addressDetail, setAddressDetail] = useState('');
  const [wardName, setWardName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Load dữ liệu ban đầu
  useEffect(() => {
    const loadPost = async () => {
      try {
        const res = await getPostDetailAPI(Number(id));
        const post = res.data;

        // Kiểm tra quyền sở hữu
        if (post.room?.owner_id !== user?.id) {
          Alert.alert('Lỗi', 'Bạn không có quyền chỉnh sửa bài này!');
          router.back();
          return;
        }

        const feat = post.room?.features ?? {};

        setRoomId(post.room.room_id);
        setTitle(post.title ?? '');
        setContent(post.content ?? '');
        setPrice(String(post.room.original_price ?? ''));
        setDiscountPrice(String(post.room.discount_price ?? ''));
        
        setAreaSize(String(feat.area_size ?? ''));
        setBedrooms(String(feat.bedrooms ?? ''));
        setBathrooms(String(feat.bathrooms ?? ''));
        
        setImages(post.media?.map((m: any) => m.file_url) ?? []);
        setAddressDetail(post.room.address?.detail ?? '');
        setWardName(post.room.address?.ward?.ward_name ?? '');

        if (post.room.address?.lat && post.room.address?.lng) {
          setCoords({
            lat: Number(post.room.address.lat),
            lng: Number(post.room.address.lng),
          });
        }

        setAmenities({
          has_wifi: feat.has_wifi === true || feat.has_wifi === 'true' || Number(feat.has_wifi) === 1,
          has_air_con: feat.has_air_con === true || feat.has_air_con === 'true' || Number(feat.has_air_con) === 1,
          has_parking: feat.has_parking === true || feat.has_parking === 'true' || Number(feat.has_parking) === 1,
          furnished: feat.furnished === true || feat.furnished === 'true' || Number(feat.furnished) === 1,
          has_balcony: feat.has_balcony === true || feat.has_balcony === 'true' || Number(feat.has_balcony) === 1,
        });

      } catch (err) {
        console.error("Lỗi nạp dữ liệu chỉnh sửa:", err);
        Alert.alert('Lỗi', 'Không thể tải bài đăng!');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [id]);

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh!'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      try {
        setUploading(true);
        const urls = await Promise.all(result.assets.map(a => uploadImageToCloudinary(a.uri)));
        setImages(prev => [...prev, ...urls].slice(0, 8));
      } catch {
        Alert.alert('Lỗi', 'Upload ảnh thất bại!');
      } finally {
        setUploading(false);
      }
    }
  };

  const toggleAmenity = (key: string) => {
    setAmenities(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề!'); return; }
    if (!price) { Alert.alert('Lỗi', 'Vui lòng nhập giá thuê!'); return; }

    try {
      setSubmitting(true);
      await updatePostAPI({
        post_id: Number(id),
        room_id: roomId,
        title, content,
        original_price: Number(price),
        discount_price: discountPrice ? Number(discountPrice) : undefined,
        area_size: areaSize ? Number(areaSize) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        ...amenities,
        address_detail: addressDetail,
        ward_name: wardName,
        lat: coords?.lat,
        lng: coords?.lng,
        image_urls: images,
      });

      if (Platform.OS === 'web') {
        router.replace(`/post/${id}`); 
      } else {
        Alert.alert('Thành công', 'Cập nhật bài đăng thành công!', [
          { text: 'OK', onPress: () => router.replace(`/post/${id}`) },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Cập nhật thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa bài đăng</Text>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Lưu</Text>}
        </TouchableOpacity>
      </View>

      {/* 🌟 THAY THẾ SCROLLVIEW GỐC BẰNG KEYBOARD AWARE SCROLL VIEW */}
      <KeyboardAwareScrollView 
        style={styles.scroll} 
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}            // Kích hoạt tính năng đẩy mượt trên Android
        extraScrollHeight={120}           // Cuộn vượt qua bàn phím một khoảng 120px
        extraHeight={100}                 // Khoảng trống đệm cho ô input
        showsVerticalScrollIndicator={false}
      >
        {/* ── Ảnh ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ảnh bài đăng</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.imageRow}>
              {images.map((uri, i) => (
                <View key={i} style={styles.imageThumb}>
                  <Image source={{ uri }} style={styles.thumbImg} />
                  <TouchableOpacity
                    style={styles.removeImg}
                    onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                  {i === 0 && (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>Ảnh chính</Text>
                    </View>
                  )}
                </View>
              ))}
              {images.length < 8 && (
                <TouchableOpacity style={styles.addImageBtn} onPress={handlePickImages} disabled={uploading}>
                  {uploading ? <ActivityIndicator color="#4F46E5" /> : <>
                    <Ionicons name="camera-outline" size={28} color="#4F46E5" />
                    <Text style={styles.addImageText}>{images.length}/8</Text>
                  </>}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>

        {/* ── Thông tin ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin bài đăng</Text>
          <Text style={styles.label}>Tiêu đề</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Tiêu đề bài đăng" />
          <Text style={styles.label}>Mô tả</Text>
          <TextInput style={[styles.input, styles.textarea]} value={content} onChangeText={setContent} multiline numberOfLines={4} textAlignVertical="top" />
        </View>

        {/* ── Giá ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giá thuê</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Giá gốc (VNĐ)</Text>
              <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Giá ưu đãi</Text>
              <TextInput style={styles.input} value={discountPrice} onChangeText={setDiscountPrice} keyboardType="numeric" />
            </View>
          </View>
        </View>

        {/* ── Thông số ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông số phòng</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Diện tích (m²)</Text>
              <TextInput style={styles.input} value={areaSize} onChangeText={setAreaSize} keyboardType="numeric" />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Phòng ngủ</Text>
              <TextInput style={styles.input} value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>WC</Text>
              <TextInput style={styles.input} value={bathrooms} onChangeText={setBathrooms} keyboardType="numeric" />
            </View>
          </View>
        </View>

        {/* ── Tiện ích ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiện ích</Text>
          <View style={styles.chipRow}>
            {AMENITIES.map(a => (
              <TouchableOpacity key={a.key} style={[styles.chip, amenities[a.key] && styles.chipActive]} onPress={() => toggleAmenity(a.key)}>
                <Text style={[styles.chipText, amenities[a.key] && styles.chipTextActive]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Địa chỉ ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Địa chỉ</Text>
          <AddressSearch
            onSelect={result => {
              setAddressDetail(result.display_name);
              setWardName(result.ward);
              setCoords({ lat: result.lat, lng: result.lng });
            }}
          />
          {addressDetail !== '' && (
            <View style={styles.currentAddress}>
              <Ionicons name="location" size={14} color="#4F46E5" />
              <Text style={styles.currentAddressText}>{addressDetail}</Text>
            </View>
          )}
        </View>

        {/* 🌟 THÊM CHIỀU CAO ĐỆM DƯỚI ĐÁY KHUNG CUỘN ĐỂ ĐẢM BẢO VIEW ĐƯỢC ĐẨY LÊN TRỌN VẸN */}
        <View style={{ height: 120 }} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? 48 : 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  submitBtn: { backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1 },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111', backgroundColor: '#FAFAFA' },
  textarea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  imageRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  imageThumb: { width: 90, height: 90, borderRadius: 10, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  removeImg: { position: 'absolute', top: 4, right: 4 },
  mainBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(79,70,229,0.8)', paddingVertical: 3, alignItems: 'center' },
  mainBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  addImageBtn: { width: 90, height: 90, borderRadius: 10, borderWidth: 1.5, borderColor: '#4F46E5', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF2FF' },
  addImageText: { fontSize: 11, color: '#4F46E5', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  chipText: { fontSize: 13, color: '#6B7280' },
  chipTextActive: { color: '#4F46E5', fontWeight: '600' },
  currentAddress: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10, padding: 10, backgroundColor: '#EEF2FF', borderRadius: 8 },
  currentAddressText: { flex: 1, fontSize: 13, color: '#4F46E5', lineHeight: 18 },
});