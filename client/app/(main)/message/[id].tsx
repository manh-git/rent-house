import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView,
  ActivityIndicator, Image, Keyboard, Modal, ScrollView, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/authStore';
import { getMessagesAPI, getChatImagesAPI } from '@/store/chat.service'; // 🔥 Thêm getChatImagesAPI
import { connectSocket, getSocket, subscribeStatus, getCachedStatus } from '@/utils/socket';
import * as ImagePicker from 'expo-image-picker';
import EmojiPicker, { EmojiType } from 'rn-emoji-keyboard';
import { uploadImageToCloudinary } from '@/utils/upload';
import ImageViewer from 'react-native-image-zoom-viewer';

const { width } = Dimensions.get('window');

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Message {
  msg_id?: number;
  conv_id: number;
  sender_id: number;
  message_text: string;
  image_urls?: string[]; 
  sent_at: string;
  pending?: boolean;
  is_read?: boolean; 
  _localKey?: string;
  media?: {
    file_url: string;
    file_type: string;
  }[];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const makeLocalKey = () => `local_${Date.now()}_${Math.random()}`;

const dedup = (msgs: Message[]): Message[] => {
  const seen = new Set<number>();
  return msgs.filter((m) => {
    if (m.pending || !m.msg_id) return true;
    if (seen.has(m.msg_id)) return false;
    seen.add(m.msg_id);
    return true;
  });
};

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { id, receiverId, receiverName, receiverAvatar } = useLocalSearchParams<{
    id: string;
    receiverId: string;
    receiverName: string;
    receiverAvatar?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  const convId = Number(id);
  const targetId = Number(receiverId);
  
  // 💡 STATE QUẢN LÝ TIN NHẮN
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(
    () => getCachedStatus(targetId) === 'online'
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);

  // 💡 STATE MENU, KHO ẢNH & XEM PHÓNG TO
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]); // 🔥 Lưu danh sách ảnh chuẩn từ API
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null); // 🔥 Index ảnh đang xem phóng to
  const [viewingImages, setViewingImages] = useState<string[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const messagesRef = useRef<Message[]>([]);

  const syncRef = (msgs: Message[]) => {
    messagesRef.current = msgs;
    return msgs;
  };

  const setMsgs = useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
    setMessages((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return syncRef(dedup(next));
    });
  }, []);

  // ── Online status ─────────────────────────────────────────────────────────
  useEffect(() => {
    const cached = getCachedStatus(targetId);
    if (cached !== null) setIsOnline(cached === 'online');

    const unsub = subscribeStatus((userId, status) => {
      if (userId === targetId) setIsOnline(status === 'online');
    });

    connectSocket().then((sock) => {
      sock.emit('check_user_status', { targetUserId: targetId });
    }).catch(() => {});

    return unsub;
  }, [targetId]);

  // ── Tải tin nhắn ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(
    async (pageNum = 1, reset = false) => {
      if (isNaN(convId)) {
        setHasMore(false);
        setMsgs((prev) => (reset ? [] : prev));
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      try {
        const res = await getMessagesAPI(convId, pageNum);
        const newMsgs: Message[] = res.data ?? [];
        setHasMore(newMsgs.length === 20);
        setPage(pageNum);
        setMsgs((prev) => {
          if (reset) return newMsgs;
          return [...prev, ...newMsgs];
        });
      } catch (e) {
        console.error('[Chat] Lỗi tải tin nhắn:', e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [convId, setMsgs]
  );

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    messagesRef.current = [];
    fetchMessages(1, true);
  }, [convId]);

  //  Hàm tải Kho ảnh từ API Backend ───────────────────────────────────────
  const fetchGalleryImages = async () => {
    if (isNaN(convId) || convId === 0) return;
    setLoadingGallery(true);
    try {
      const res = await getChatImagesAPI(convId);
      const rawData = res.data || res.images || res || [];
      const extractedUrls = rawData.map((item: any) => item.file_url || item);
      setGalleryImages(extractedUrls);
    } catch (error) {
      console.error("Lỗi khi fetch kho ảnh từ API:", error);
      // Fallback fallback gom tạm từ tin nhắn nếu API lỗi
      setGalleryImages(getFallbackImages());
    } finally {
      setLoadingGallery(false);
    }
  };

  // Gom tạm ảnh từ state tin nhắn hiện tại (để fallback hoặc dùng khi ấn trực tiếp tin nhắn)
  const getFallbackImages = () => {
    const images: string[] = [];
    [...messages].reverse().forEach(m => {
      if (m.media && m.media.length > 0) {
        m.media.forEach(mediaItem => {
          if (mediaItem.file_type === 'image') images.push(mediaItem.file_url);
        });
      } else if (m.image_urls && m.image_urls.length > 0) {
        m.image_urls.forEach(url => images.push(url));
      }
    });
    return images;
  };

  // Trả về danh sách ảnh đang dùng chính thức (Ưu tiên ảnh từ API, nếu trống dùng ảnh từ list tin nhắn)
  const getActiveImagesList = () => {
    return galleryImages.length > 0 ? galleryImages : getFallbackImages();
  };

  // ── Socket nhận tin nhắn & Xử lý đánh dấu đã xem ──────────────────────────────
  useEffect(() => {
    let mounted = true;
    let cleanup: (()=> void) | undefined;

    const setup = async () => {
      let sock: Awaited<ReturnType<typeof connectSocket>>;
      try { sock = await connectSocket(); } catch (err) { return; }
      if (!mounted) return;

      if (!isNaN(convId)) {
        sock.emit('join_conversation', { convId });
      }

      const onReceiveMessage = (msg: Message) => {
        if (!mounted || Number(msg.conv_id) !== convId) return;
        
        if (msg.sender_id !== user?.id) {
          sock.emit('read_messages', { convId });
          msg.is_read = true; 
        }

        setMsgs((prev) => {
          if (msg.msg_id && prev.some((m) => m.msg_id === msg.msg_id)) return prev;
          if (msg.sender_id !== user?.id) return [msg, ...prev];
          return prev.some((m) => m.pending && (m.message_text === msg.message_text || m.image_urls?.[0] === msg.image_urls?.[0])) ? prev : [msg, ...prev];
        });

        // Nếu đang mở kho ảnh thì cập nhật lại khi có tin nhắn mới chứa ảnh
        if ((msg.image_urls?.length || msg.media?.length) && isGalleryOpen) {
          fetchGalleryImages();
        }
      };

      const onMessageSent = (confirmedMsg: Message) => {
        if (isNaN(convId) || convId === 0) {
          router.setParams({ id: String(confirmedMsg.conv_id) });
        }
        if (!mounted || Number(confirmedMsg.conv_id) !== convId) return;
        setMsgs((prev) => {
          const idx = prev.findIndex((m) => m.pending && (
            (confirmedMsg.image_urls?.length && m.image_urls?.[0] === confirmedMsg.image_urls?.[0]) || 
            (!confirmedMsg.image_urls?.length && m.message_text === confirmedMsg.message_text)
          ));
          if (idx === -1) return [confirmedMsg, ...prev];
          const updated = [...prev];
          updated[idx] = { ...confirmedMsg, pending: false };
          return updated;
        });

        if (isGalleryOpen) fetchGalleryImages();
      };

      const onMessagesReadUpdate = (data: { convId: number, readerId: number }) => {
        if (!mounted || data.convId !== convId || data.readerId === user?.id) return;
        setMsgs((prev) => prev.map(m => m.sender_id === user?.id ? { ...m, is_read: true } : m));
      };

      sock.on('receive_message', onReceiveMessage);
      sock.on('message_sent', onMessageSent);
      sock.on('messages_read_update', onMessagesReadUpdate); 

      cleanup = () => {
        sock.off('receive_message', onReceiveMessage);
        sock.off('message_sent', onMessageSent);
        sock.off('messages_read_update', onMessagesReadUpdate);
        sock.emit('leave_conversation', { convId });
      };
    };

    setup();
    return () => { mounted = false; cleanup?.(); };
  }, [convId, user?.id, setMsgs, isGalleryOpen]);

  // ── Gửi tin nhắn Text ──────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const sock = getSocket();
    if (!sock?.connected) return;

    const optimistic: Message = {
      _localKey: makeLocalKey(),
      conv_id: convId,
      sender_id: user?.id ?? 0,
      message_text: trimmed,
      sent_at: new Date().toISOString(),
      pending: true,
      is_read: false,
    };

    setMsgs((prev) => [optimistic, ...prev]);
    setText('');

    sock.emit('send_message', {
      convId,
      receiverId: targetId,
      message: trimmed,
    });
  }, [text, convId, targetId, user?.id, setMsgs]);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Ứng dụng cần quyền truy cập thư viện ảnh để gửi hình!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUris = result.assets.map(asset => asset.uri);
      const localKey = makeLocalKey();
      
      // 1. Tạo tin nhắn tạm thời hiển thị ảnh cục bộ ngay lập tức
      const optimistic: Message = {
        _localKey: localKey,
        conv_id: convId,
        sender_id: user?.id ?? 0,
        message_text: "[Hình ảnh]",
        image_urls: localUris, 
        sent_at: new Date().toISOString(),
        pending: true,
        is_read: false,
      };
      setMsgs((prev) => [optimistic, ...prev]);

      try {
        // 2. Chạy hàm uploadImageToCloudinary bạn vừa cung cấp cho từng tấm ảnh
        const uploadPromises = localUris.map(uri => uploadImageToCloudinary(uri));
        const cdnUrls = await Promise.all(uploadPromises);

        const sock = getSocket();
        if (sock?.connected) {
          // 3. Emit lên socket (Hãy chắc chắn phía backend đọc đúng key của mảng này)
          sock.emit('send_message', {
            convId,
            receiverId: targetId,
            message: "[Hình ảnh]",
            imageUrls: cdnUrls // Gửi mảng link sản phẩm từ Cloudinary lên Server
          });

          // 4. Cập nhật mảng cục bộ từ URI máy sang URL Cloudinary trực tiếp để nhấn xem được luôn
          setMsgs((prev) => prev.map(m => 
            m._localKey === localKey ? { ...m, image_urls: cdnUrls } : m
          ));
          
          // Đọc lại kho ảnh để album cập nhật ảnh mới ngay lập tức
          fetchGalleryImages();
        } else {
          throw new Error('Mất kết nối máy chủ Socket.');
        }
      } catch (error: any) {
        console.error("Lỗi trong quá trình xử lý gửi ảnh:", error);
        alert("Không thể gửi ảnh, vui lòng thử lại.");
        setMsgs((prev) => prev.filter(m => m._localKey !== localKey));
      }
    }
  };

  const handlePickEmoji = (emojiObject: EmojiType) => {
    setText((prev) => prev + emojiObject.emoji);
  };

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    fetchMessages(page + 1, false);
  }, [hasMore, loadingMore, loading, page, fetchMessages]);

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMe = item.sender_id === user?.id;
      const olderMsg = messages[index + 1];
      const showTimeSep =
        !olderMsg ||
        Math.abs(new Date(item.sent_at).getTime() - new Date(olderMsg.sent_at).getTime()) > 5 * 60 * 1000;

      const isLatestMyMsg = isMe && index === 0;

      let allImages: string[] = [];
      if (item.media && item.media.length > 0) {
        allImages = item.media.map(m => m.file_url);
      } else if (item.image_urls && item.image_urls.length > 0) {
        allImages = item.image_urls;
      }

      const hasImages = allImages.length > 0;

      return (
        <View style={{ marginBottom: 6 }}>
          {showTimeSep && <Text style={styles.timeLabel}>{formatTime(item.sent_at)}</Text>}
          <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
            {!isMe && (
              <View style={styles.msgAvatar}>
                {receiverAvatar ? (
                  <Image source={{ uri: receiverAvatar }} style={styles.msgAvatarImg} />
                ) : (
                  <Text style={styles.msgAvatarText}>{receiverName?.[0]?.toUpperCase() ?? '?'}</Text>
                )}
              </View>
            )}
            
            <View style={[
              styles.bubble, 
              isMe ? styles.bubbleMe : styles.bubbleThem,
              hasImages ? { paddingHorizontal: 0, paddingVertical: 0, backgroundColor: 'transparent' } : null
            ]}>
              {hasImages ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, maxWidth: 244 }}>
                  {allImages.map((url, i) => {
                    return (
                      <TouchableOpacity 
                        key={i} 
                        activeOpacity={0.9}
                        style={{ width: allImages.length > 1 ? 116 : 240, height: 150, position: 'relative' }}
                        onPress={() => {
                          // Khi nhấn trực tiếp vào ảnh trong chat, tìm vị trí của nó trong danh mục ảnh tổng
                          const currentList = getActiveImagesList();
                          const globalIdx = currentList.indexOf(url);
                          if (globalIdx !== -1) {
                            setViewingImageIndex(globalIdx);
                          } else {
                            // Dự phòng nếu ảnh chưa kịp đồng bộ vào mảng tổng
                            setGalleryImages([url]);
                            setViewingImageIndex(0);
                          }
                        }}
                      >
                        <Image source={{ uri: url }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                        {item.pending && (
                          <View style={styles.imageLoadingOverlay}>
                            <ActivityIndicator color="#fff" size="small" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                  {item.message_text}
                </Text>
              )}
            </View>
          </View>
          
          {isLatestMyMsg && item.is_read && !item.pending && (
            <Text style={[styles.readReceiptText, { textAlign: 'right' }]}>Đã xem</Text>
          )}
        </View>
      );
    },
    [messages, user?.id, receiverAvatar, receiverName, galleryImages]
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* ─── HEADER BAR ────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        
        <View style={styles.headerUser}>
          <View style={styles.headerAvatar}>
            {receiverAvatar ? (
              <Image source={{ uri: receiverAvatar }} style={styles.headerAvatarImg} />
            ) : (
              <Text style={styles.headerAvatarText}>{receiverName?.[0]?.toUpperCase() ?? '?'}</Text>
            )}
          </View>
          <View>
            <Text style={styles.headerName}>{receiverName}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, !isOnline && styles.statusDotOffline]} />
              <Text style={[styles.headerStatus, !isOnline && styles.headerStatusOffline]}>
                {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.moreBtn} onPress={() => setIsMenuOpen(true)}>
          <Ionicons name="ellipsis-vertical" size={22} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#4F46E5" size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            inverted
            keyExtractor={(item, i) => item.msg_id?.toString() ?? item._localKey ?? `i_${i}`}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.2}
            ListFooterComponent={loadingMore ? <ActivityIndicator color="#4F46E5" style={{ marginVertical: 12 }} /> : null}
            ListEmptyComponent={
              <View style={[styles.emptyBox, { transform: [{ scaleY: -1 }] }]}>
                <Text style={styles.emptyText}>Hãy bắt đầu cuộc trò chuyện 👋</Text>
              </View>
            }
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          />
        )}

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handlePickImage}>
            <Ionicons name="image-outline" size={22} color="#4F46E5" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => {
              Keyboard.dismiss();
              setIsEmojiOpen(!isEmojiOpen);
            }}
          >
            <Ionicons name={isEmojiOpen ? "keyboard-outline" : "happy-outline"} size={22} color="#4F46E5" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={(val) => {
              setText(val);
              if(isEmojiOpen) setIsEmojiOpen(false);
            }}
            onFocus={() => setIsEmojiOpen(false)}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <EmojiPicker
        onEmojiSelected={handlePickEmoji}
        open={isEmojiOpen}
        onClose={() => setIsEmojiOpen(false)}
        categoryPosition="bottom"
        expandable={false}
      />

      {/* ─── MODAL MENU BA CHẤM ─────────────────────────────────────────── */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableOpacity 
          style={styles.menuModalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsMenuOpen(false)}
        >
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle} numberOfLines={1}>{receiverName}</Text>
            <View style={styles.menuDivider} />

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setIsMenuOpen(false);
                router.push(`/profile/${targetId}` as any);
              }}
            >
              <Ionicons name="person-circle-outline" size={24} color="#111" />
              <Text style={styles.menuItemText}>Xem trang cá nhân</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setIsMenuOpen(false);
                setIsGalleryOpen(true);
                fetchGalleryImages(); 
              }}
            >
              <Ionicons name="images-outline" size={24} color="#111" />
              <Text style={styles.menuItemText}>Ảnh đã gửi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── MODAL KHO ẢNH ĐÃ GỬI (GRID GALLERY) ───────────────────────────── */}
      <Modal
        visible={isGalleryOpen}
        animationType="slide"
        onRequestClose={() => setIsGalleryOpen(false)}
      >
        <SafeAreaView style={styles.gallerySafe}>
          <View style={styles.galleryHeader}>
            <TouchableOpacity style={styles.galleryCloseBtn} onPress={() => setIsGalleryOpen(false)}>
              <Ionicons name="close" size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.galleryTitle}>Ảnh đã trao đổi</Text>
            <View style={{ width: 40 }} />
          </View>

          {loadingGallery ? (
            <View style={styles.galleryEmptyBox}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={{ color: '#6B7280' }}>Đang tải kho ảnh...</Text>
            </View>
          ) : getActiveImagesList().length === 0 ? (
            <View style={styles.galleryEmptyBox}>
              <Ionicons name="image-outline" size={64} color="#D1D5DB" />
              <Text style={styles.galleryEmptyText}>Chưa có hình ảnh nào được gửi</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.galleryGrid}>
              {getActiveImagesList().map((url, index) => (
                <TouchableOpacity 
                  key={index} 
                  activeOpacity={0.9}
                  style={styles.galleryImageWrapper}
                  onPress={() => {
  const list = getActiveImagesList();
  setViewingImages(list); // Lưu danh sách vào state
  setViewingImageIndex(list.indexOf(url));
}}
                >
                  <Image source={{ uri: url }} style={styles.galleryImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <Modal 
  visible={viewingImageIndex !== null} 
  transparent={true} // Bắt buộc cho thư viện này
  onRequestClose={() => setViewingImageIndex(null)}
>
  <ImageViewer 
    imageUrls={getActiveImagesList().map(url => ({ url }))} // Convert danh sách string sang object {url}
    index={viewingImageIndex ?? 0} // Index hiện tại
    onSwipeDown={() => setViewingImageIndex(null)} // Vuốt xuống để đóng
    enableSwipeDown={true}
    renderHeader={() => (
      <TouchableOpacity 
        style={styles.viewerCloseBtn} 
        onPress={() => setViewingImageIndex(null)}
      >
        <Ionicons name="close" size={26} color="#fff" />
      </TouchableOpacity>
    )}
  />
</Modal>

    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  flex1: { flex: 1 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? 48 : 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  moreBtn: {
    width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
  },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#818CF8',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  headerAvatarImg: { width: '100%', height: '100%' },
  headerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerName: { fontSize: 15, fontWeight: '700', color: '#111' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  statusDotOffline: { backgroundColor: '#D1D5DB' },
  headerStatus: { fontSize: 12, color: '#10B981' },
  headerStatusOffline: { color: '#9CA3AF' },
  messageList: { padding: 16, paddingBottom: 8 },
  timeLabel: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginVertical: 10 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#818CF8', justifyContent: 'center', alignItems: 'center' },
  msgAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  msgAvatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: '#4F46E5', borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  bubbleText: { fontSize: 15, color: '#111', lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12
  },
  actionBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
    color: '#111', backgroundColor: '#F9FAFB', maxHeight: 120,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#A5B4FC' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
  readReceiptText: { fontSize: 11, color: '#9CA3AF', marginRight: 4, marginTop: 2 },

  /* ─── MENU 3 CHẤM STYLES ────────────────────────────────────────── */
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
  },

  /* ─── KHO ẢNH STYLES ────────────────────────────────────────────── */
  gallerySafe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? 44 : 12,
  },
  galleryCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
  },
  galleryImageWrapper: {
    width: (width - 16) / 3,
    height: (width - 16) / 3,
    margin: 2,
    backgroundColor: '#F3F4F6',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryEmptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  galleryEmptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },

  /* ─── 🔥 VIEWER PHÓNG TO STYLES ─────────────────────────────────────── */
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'android' ? 44 : 12,
  },
  viewerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerIndexText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewerImageContainer: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerFullImage: {
    width: width,
    height: '100%',
  },
});