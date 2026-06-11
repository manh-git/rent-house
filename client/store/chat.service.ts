import axios from 'axios';
import { API } from './authStore';

export const getMessagesAPI = async (convId: number, page: number, limit: number = 20) => {
  try {
    const response = await API.get(`/chat/${convId}/messages`, {
      params: { page, limit },
    });
    return response.data; 
  } catch (error: any) {
    console.error('Lỗi khi gọi API tin nhắn:', error?.response?.data || error.message);
    throw error;
  }
};

export const getListConvAPI = async () => {
  try {
    const response = await API.get('/chat/conversation');
    return response.data;
  } catch (error: any) {
    console.error('Lỗi tải danh sách hội thoại:', error?.response?.data || error.message);
    throw error;
  }
};

export const getFindRoom = async (receiverId: number) => {
  try {
    const response = await API.get(`/chat/find-room/${receiverId}`);
    return response.data;
  } catch (e: any) {
    console.error('Lỗi khi tìm phòng chat:', e?.response?.data || e.message);
    throw e;
  }
};

export const getUnreadCountAPI = async () => {
  try {
    const response = await API.get('/chat/unread-count');
    return response.data; 
  } catch (error: any) {
    console.error('Lỗi lấy số lượng tin nhắn chưa đọc:', error?.response?.data || error.message);
    throw error;
  }
};

export const markConversationAsReadAPI = async (convId: number) => {
  try {
    const response = await API.put(`/chat/${convId}/read`);
    return response.data; 
  } catch (error: any) {
    console.error(`Lỗi khi đánh dấu đã đọc phòng chat ${convId}:`, error?.response?.data || error.message);
    throw error;
  }
};

export const getChatImagesAPI = async (convId: number) => {
  try {
    const response = await API.get(`/chat/${convId}/images`);
    return response.data; 
  }catch(error){
    console.error(`Lỗi khi tải kho ảnh của phòng chat ${convId}:`, error);
    throw error;
  }
};