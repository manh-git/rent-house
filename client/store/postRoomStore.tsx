import { create } from 'zustand';
import axios from 'axios';

// 1. Cấu hình instance Axios tại đây luôn
const api = axios.create({
  baseURL: 'http://192.168.1.100:3000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 2. Định nghĩa kiểu dữ liệu
interface Room {
  id: string;
  title: string;
  price: number;
  address: string;
  // Thêm các trường khác từ Prisma của bạn...
}

interface RoomState {
  rooms: Room[];
  isLoading: boolean;
  error: string | null;
  fetchRooms: () => Promise<void>;
}

// 3. Gộp cả API call vào trong Zustand Store
export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  isLoading: false,
  error: null,

  fetchRooms: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/post_room/getlistpost');
      set({ rooms: response.data, isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || 'Lỗi khi tải dữ liệu' 
      });
      console.error('Lỗi khi lấy danh sách phòng:', error);
    }
  },
}));