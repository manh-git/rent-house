import { API } from './authStore';

// ─── USER MANAGEMENT ─────────────────────────────────────────
export const lockUserAPI = async (targetId: number, actionType: string) => {
  const res = await API.post('/admin/user/lock', { targetId, actionType });
  return res.data;
};

export const unlockUserAPI = async (targetId: number, actionDetail: string) => {
  const res = await API.post('/admin/user/unlock', { targetId, actionDetail });
  return res.data;
};

export const updateRoleAPI = async (targetUserId: number, newRoleId: number) => {
  const res = await API.put('/admin/user/role', { targetUserId, newRoleId });
  return res.data;
};

export const searchUsersAPI = async (key?: string, index = 0, count = 10) => {
  const res = await API.get('/admin/user/search', { params: { key, index, count } });
  return res.data;
};

export const getUserActivitiesAPI = async (targetId: number, index = 0, count = 10) => {
  const res = await API.get(`/admin/user/activities/${targetId}`, { params: { index, count } });
  return res.data;
};

// ─── CONTENT MANAGEMENT ──────────────────────────────────────
export const deleteReviewAPI = async (targetId: number, actionDetail: string, type: number) => {
  const res = await API.post('/admin/review/delete', { targetId, actionDetail, type });
  return res.data;
};

export const deletePostAPI = async (postId: number, roomId: number, actionDetail: string) => {
  const res = await API.post('/admin/post/delete', { postId, roomId, actionDetail });
  return res.data;
};
export const admindeleteRoommateAPI = async(postId: number, actionDetail: string)=>{
  const res = await API.post('/admin/postRoommate/delete', {postId, actionDetail});
  return res.data;
}
// ─── SYSTEM & FINANCE ────────────────────────────────────────
export const getAdminLogsAPI = async (index = 0, count = 10, key?: string, startDate?: string, endDate?: string) => {
  const res = await API.get('/admin/logs', { params: { index, count, key, startDate, endDate } });
  return res.data;
};

export const getWithdrawalsAPI = async () => {
  const res = await API.get('/admin/withdrawals');
  return res.data;
};

export const updateWithdrawalAPI = async (withdrawalId: number, status: string) => {
  const res = await API.put('/admin/withdrawal/status', { withdrawalId, status });
  return res.data;
};