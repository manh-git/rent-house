import axios from 'axios';

// Thay bằng IP máy tính của bạn nếu chạy máy ảo Android
const BASE_URL = 'http://192.168.1.100:3000/api'; 

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Hàm lấy danh sách phòng trọ
export const getRooms = async () => {
  try {
    const response = await api.get('/post_room/getlistpost');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách phòng:', error);
    throw error;
  }
};

export default api;