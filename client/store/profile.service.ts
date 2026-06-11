import { API } from '@/store/authStore';

export const getUserPostsListAPI = async (userId?: number) => {
  
  const res = await API.get(`/post_room/getlistpost1?user_id=${userId}`); 
  return res.data;
};

export const getUserRoommateListAPI = async (userId?: number) => {
  
  const res = await API.get(`/roommate/getlistpost1?user_id=${userId}`);
  return res.data;
};