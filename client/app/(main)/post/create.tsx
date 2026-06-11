import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator,
  SafeAreaView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { uploadImageToCloudinary } from '@/utils/upload';
import { createPostAPI } from '@/store/post.service';
import { AddressSearch } from '@/components/AddressSearch';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AMENITIES = [
  { key: 'has_wifi',     label: '📶 Wifi' },
  { key: 'has_air_con',  label: '❄️ Điều hoà' },
  { key: 'has_parking',  label: '🅿️ Đậu xe' },
  { key: 'furnished',    label: '🛋️ Nội thất' },
  { key: 'has_balcony',  label: '🌿 Ban công' },
];

export default function CreatePostScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [areaSize, setAreaSize] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [amenities, setAmenities] = useState<Record<string, boolean>>({});

  const [addressDetail, setAddressDetail] = useState('');
  const [wardName, setWardName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (key: string) => {
    setAmenities(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề!'); return; }
    if (!price) { Alert.alert('Lỗi', 'Vui lòng nhập giá thuê!'); return; }
    if (!addressDetail) { Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ!'); return; }
    if (!coords) { Alert.alert('Lỗi', 'Vui lòng chọn địa chỉ từ gợi ý để lấy toạ độ!'); return; }
    if (images.length === 0) { Alert.alert('Lỗi', 'Vui lòng thêm ít nhất 1 ảnh!'); return; }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('original_price', String(price));
      formData.append('address[ward_name]', wardName || '');
      formData.append('address[detail]', addressDetail);
      formData.append('address[lat]', String(coords.lat));
      formData.append('address[lng]', String(coords.lng));
      formData.append('post[title]', title.trim());
      formData.append('post[content]', content.trim());
      formData.append('features[area_size]', String(areaSize || 0));
      formData.append('features[has_wifi]', String(!!amenities['has_wifi']));
      formData.append('features[has_air_con]', String(!!amenities['has_air_con']));
      formData.append('features[has_parking]', String(!!amenities['has_parking']));
      formData.append('features[furnished]', String(!!amenities['furnished']));
      formData.append('features[has_balcony]', String(!!amenities['has_balcony']));
      formData.append('features[neighborhood_safety_score]', '5');
      formData.append('features[floors]', '1');
      formData.append('features[bedrooms]', String(bedrooms || 0));
      formData.append('features[bathrooms]', String(bathrooms || 0));

      images.forEach((url) => { formData.append('image_urls', url); });

      const res = await createPostAPI(formData);
      const newPostId = res.data?.data?.post?.post_id || res.data?.post?.post_id;

      if (!newPostId) {
        const errorMsg = 'Đăng bài không thành công!';
        if (Platform.OS === 'web') {
          window.alert(`Lỗi: ${errorMsg}`);
          router.replace('/');
        } else {
          Alert.alert('Lỗi', errorMsg, [{ text: 'OK', onPress: () => router.replace('/') }]);
        }
        return;
      }

      if (Platform.OS === 'web') {
        window.alert('Đăng bài thành công!');
        router.replace(`/post/${newPostId}`);
      } else {
        Alert.alert('Thành công', 'Đăng bài viết mới thành công!', [
          { text: 'Xem bài viết', onPress: () => router.replace(`/post/${newPostId}`) },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Đăng bài thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng bài mới</Text>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Đăng</Text>}
        </TouchableOpacity>
      </View>

      {/* 🌟 THAY THẾ KEYBOARDAVOIDINGVIEW VÀ SCROLLVIEW THƯỜNG BẰNG THÀNH PHẦN NÀY */}
      <KeyboardAwareScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}            // Bật tính năng nhảy view cả trên Android
        extraScrollHeight={120}           // Khoảng đệm cuộn thêm vượt qua bàn phím (Pixel)
        extraHeight={100}                 // Khoảng đệm cho chiều cao input
        showsVerticalScrollIndicator={false}
      >
        {/* ── Ảnh ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ảnh bài đăng <Text style={styles.required}>*</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.imageRow}>
              {images.map((uri, i) => (
                <View key={i} style={styles.imageThumb}>
                  <Image source={{ uri }} style={styles.thumbImg} />
                  <TouchableOpacity style={styles.removeImg} onPress={() => removeImage(i)}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                  {i === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Ảnh chính</Text></View>}
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

        {/* ── Thông tin cơ bản ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin bài đăng</Text>
          <Text style={styles.label}>Tiêu đề <Text style={styles.required}>*</Text></Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="VD: Phòng trọ quận 1 full nội thất..." />
          <Text style={styles.label}>Mô tả</Text>
          <TextInput style={[styles.input, styles.textarea]} value={content} onChangeText={setContent} placeholder="Mô tả chi tiết về phòng trọ..." multiline numberOfLines={4} textAlignVertical="top" />
        </View>

        {/* ── Giá thuê ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giá thuê</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Giá gốc (VNĐ) <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="VD: 3000000" keyboardType="numeric" />
            </View>
          </View>
        </View>

        {/* ── Thông số ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông số phòng</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Diện tích (m²)</Text>
              <TextInput style={styles.input} value={areaSize} onChangeText={setAreaSize} placeholder="VD: 25" keyboardType="numeric" />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Phòng ngủ</Text>
              <TextInput style={styles.input} value={bedrooms} onChangeText={setBedrooms} placeholder="VD: 1" keyboardType="numeric" />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>WC</Text>
              <TextInput style={styles.input} value={bathrooms} onChangeText={setBathrooms} placeholder="VD: 1" keyboardType="numeric" />
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

        {/* ── Địa chỉ + Bản đồ ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Địa chỉ <Text style={styles.required}>*</Text></Text>
          <AddressSearch
            onSelect={(result) => {
              setAddressDetail(result.display_name);
              setWardName(result.ward);
              setCoords({ lat: result.lat, lng: result.lng });
            }}
          />
        </View>

        {/* 🌟 TĂNG KHÔNG GIAN ĐỆM DƯỚI ĐÁY ĐỂ CHẮC CHẮN LUÔN CÓ CHỖ ĐẨY */}
        <View style={{ height: 120 }} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? 48 : 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  submitBtn: { backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 14 },
  required: { color: '#EF4444' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111', backgroundColor: '#FAFAFA' },
  textarea: { height: 100 },
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
});