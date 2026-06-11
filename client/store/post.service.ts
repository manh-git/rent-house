import { API } from '@/store/authStore';

export interface PostFilter {
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  hasWifi?: boolean;
  hasAirCon?: boolean;
  hasParking?: boolean;
  page?: number;
  limit?: number;
}

export const getPostsAPI = async (filter: PostFilter = {}) => {
    const { page = 1, limit = 10, ...restFilters } = filter;

  const params = {
    ...restFilters,
    index: page - 1, // Nếu page = 1 thì index = 0 -> skip = 0 * 10 = 0 (Lấy từ bài đầu tiên)
    count: limit,    // Đóng vai trò là số lượng bản ghi cần lấy (take)
  };
  const res = await API.get('/post_room/getlistpost', { params });
  return res.data;
};

export const createPostAPI = async (data: FormData) => {
  const res = await API.post('/post_room/rooms', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};


export const getPostDetailAPI = async (postId: number) => {
  const res = await API.get(`/post_room/getroom/${postId}`);
  return res.data;
};

export const updatePostAPI = async (data: any) => {
  const res = await API.put('/post_room/rooms', data);
  return res.data;
};

export const deletePostAPI = async (roomId: number) => {
  const res = await API.delete(`/post_room/rooms/${roomId}`);
  return res.data;
};

export const getWardAPI = async()=>{
  const res = await API.get('/post_room/ward');
  return res.data;
}