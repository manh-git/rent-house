import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, Text, StyleSheet, RefreshControl } from 'react-native';
import { PostCard } from '@/components/PostCars'; // Giả sử bạn đã tách PostCard ra file này
import { getUserPostsListAPI, getUserRoommateListAPI } from '@/store/profile.service';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/authStore';
import { RoommateList } from '@/components/Roommate';
import { getWardAPI } from '@/store/post.service';
import { deleteRoommateAPI } from '@/store/roommate.service';
export default function MyPostsScreen() {
  const [posts,  setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const user = useAuth();
  const [list, setList] = useState([]);
  const { id }= useLocalSearchParams();
  const targetUserId = id || user.user?.id;

  const [wards, setWards] = useState<any[]>([]);
 const fetchWards = async () => {
      try {
        const res = await getWardAPI();
        setWards(res.data ?? []);
      } catch {}
    };
  const fetchMyPosts = async () => {
    if(!targetUserId) return;
    try {
      setLoading(true);
      let res;
        res = await getUserPostsListAPI(Number(targetUserId));
        setPosts(res.data);
      
       
        res = await getUserRoommateListAPI(Number(targetUserId));
        const listData = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      setList(listData);
      
    } catch (error) {
      console.error("Lỗi khi tải bài đăng của tôi:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
 
  const isOwn = Number(targetUserId) === Number(user.user?.id);
  useEffect(() => {
    if(targetUserId){
    fetchMyPosts();}
    fetchWards();
  }, [targetUserId]);

 
  const isOwnerRole = posts.length > 0 && posts[0]?.room?.owner?.role_id === 2;

  
  if (isOwnerRole) {
    return (
      <View style={styles.container}>
        <FlatList
        contentContainerStyle={{ 
          paddingTop: 16,
  }}
          data={posts}
          keyExtractor={(item) => item?.post_id ? item.post_id.toString() : Math.random().toString()}
          renderItem={({ item }) => (
            <PostCard post={item} onPress={() => router.push(`/post/${item.post_id}` as any)} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchMyPosts} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có bài đăng phòng nào.</Text>}
        />
      </View>
    );
  }

  // 2. Nếu là role 1, dùng luôn Component RoommateList đã tách
  return (
    <View style={styles.container}>
      <RoommateList
        data={list}
        loading={loading}
        isAdmin={false}
        onDeleteAction={(id: number)=> deleteRoommateAPI(id)}
        currentUserId={user.user?.id}
        isEditable = {isOwn}
        onRefresh={fetchMyPosts}
        wards = {wards}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  listPadding: { paddingVertical: 16 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#6B7280', fontSize: 16 }
});