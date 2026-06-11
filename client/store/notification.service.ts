import { API } from '@/store/authStore';

export const getNotificationsAPI = async (page = 1) => {
  const res = await API.get('/notification', { params: { page } });
  return res.data;
};

export const markAllReadAPI = async () => {
  const res = await API.patch('/notification/read-all');
  return res.data;
};

export const markOneReadAPI = async (notifId: number) => {
  try{
  console.log(notifId)
  const res = await API.patch(`/notification/read/${notifId}`);
  return res.data;}
  catch(e){
    console.error(e)
  }
};