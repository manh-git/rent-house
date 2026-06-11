import { API } from '@/store/authStore';

export interface RoommateFilter {
  preferred_gender?: string;
  minAge?: number;
  maxAge?: number;
  ward_id?: number;
  budget?: number;
  page?: number;
  limit?: number;
}

// Lấy danh sách yêu cầu tìm bạn cùng phòng
export const getListRoommateAPI = async (params: {
  index?: number;
  count?: number;
  preferred_gender?: string;
  min_age?: string | number;
  max_age?: string | number;
  budget?: string | number;
  habits?: string;
  ward_id?: string | number;
}) => {

  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
  );
 
  const res = await API.get('/roommate/getlistpost', { params: filteredParams });
  return res.data;
};
// Tạo yêu cầu tìm bạn cùng phòng
export const createRoommateAPI = async (data: any) => {
  const res = await API.post('/roommate/rooms', data);
  return res.data;
};

// Lấy chi tiết một yêu cầu tìm bạn
export const getRoommateDetailAPI = async (requestId: number) => {
  const res = await API.get(`/roommate/getroom/${requestId}`);
  return res.data;
};

// Cập nhật yêu cầu tìm bạn
export const updateRoommateAPI = async (data: any) => {
  const res = await API.put('/roommate/rooms', data);
  return res.data;
};

// Xóa yêu cầu tìm bạn
export const deleteRoommateAPI = async (requestId: number) => {
  const res = await API.delete(`/roommate/rooms/${requestId}`);
  return res.data;
};