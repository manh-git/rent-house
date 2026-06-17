import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Cookies from 'js-cookie';
import { create } from 'zustand';
import { jwtDecode } from "jwt-decode";

interface UserPayload {
  userId: number;
  roleId: number;
  fullName: string;
  exp: number;
  avatarUrl: string | null;
  phoneNumber?: string;
  isActive: boolean; 
}

interface AuthState {
  isLoggedIn: boolean;
  user: {
    id: number;
    role: number;
    name: string;
    exp: number;
    avatarUrl?: string | null;
    phoneNumber?: string;
  } | null;
  setLogin: (accessToken: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  getUserInfor: () => Promise<void>;
  updateUserInfor: (data: any) => Promise<any>;
  clearSession: () => Promise<void>; 
}

const getBaseURL = () => {
  if (Platform.OS === 'web') {
    return ' https://rent-house-h3hl.onrender.com'; 
  }
  return ' https://rent-house-h3hl.onrender.com'; 
};

export const API = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

// ── REQUEST INTERCEPTOR ───────────────────────────────────────────────
API.interceptors.request.use(
  async (config) => {
    const token = Platform.OS === 'web' 
      ? Cookies.get('accessToken') 
      : await SecureStore.getItemAsync('accessToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// ── RESPONSE INTERCEPTOR ──────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (token) prom.resolve(token);
    else prom.reject(error);
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/user/refresh-token')) {
        await useAuth.getState().logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return API(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await API.post('/user/refresh-token'); // gọi endpoint refresh
        const newAccessToken = res.data.accessToken;

        await saveStorage('accessToken', newAccessToken);
        useAuth.getState().setLogin(newAccessToken);

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await useAuth.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── STORAGE UTILS ─────────────────────────────────────────────────────
const saveStorage = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    Cookies.set(key, value, { expires: 7, secure: Platform.OS === 'web', sameSite: 'strict' });
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const removeStorage = async (key: string) => {
  if (Platform.OS === 'web') {
    Cookies.remove(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

// ── API CALLS ─────────────────────────────────────────────────────────
export const register = async (email: string, password: string, fullName: string) => {
  const res = await API.post('/user/register', { email, password, fullName, role_id: 2 });
  return res.data; 
};

export const verifyOTP = async (userId: number, otp: string) => {
  const res = await API.get('/user/confirm-email', {
    params: { userId, otp }
  });
  return res.data;
};

export const resendOTP = async (userId: number, email: string) => {
  const res = await API.post('/user/resend-otp', { userId, email });
  return res.data;
};

export const login = async (email: string, password: string) => {
  const res = await API.post('/user/login', { email, password });
  const { accessToken, refreshToken } = res.data;

  if (!accessToken || !refreshToken) {
    console.error("Lỗi: Không nhận được Token từ server!");
    throw new Error("Dữ liệu Token không hợp lệ");
  }

  try {
    await saveStorage('accessToken', accessToken);
    await saveStorage('refreshToken', refreshToken);
    console.log("Đã lưu token vào Cookie/SecureStore");
    return res.data;
  } catch (error) {
    console.error("Lỗi khi lưu:", error);
    throw error;
  }
};

export const loginWithGoogle = async (idToken: string) => {
  const res = await API.post('/user/google', { idToken });
  const { accessToken, refreshToken } = res.data;
  await saveStorage('accessToken', accessToken);
  await saveStorage('refreshToken', refreshToken);

  useAuth.getState().setLogin(accessToken);
  return res.data;
};

export const getUserInfoAPI = async () => {
  const res = await API.get('/user/getUserInfor'); 
  return res.data;
};

export const updateUserInfoAPI = async (data: any) => {
  const res = await API.put('/user/updateInfor', data); 
  return res.data;
};

export const changePass = async (data: any) => {
  const res = await API.post('/user/change-password', data);
  return res.data;
};

export const forgotPass = async (data: any) => {
  const res = await API.post('/user/forgot-password', data);
  return res.data;
};

export const resetPass = async (data: any) => {
  const res = await API.post('/user/reset-password', data);
  return res.data;
};
export const getListConvAPI = async () => {
  const res = await API.get('/chat/conversation');
  return res.data;
};

export const getMessagesAPI = async (convId: number, page = 1, limit = 20) => {
  const res = await API.get(`/chat/${convId}/messages`, {
    params: { page, limit }
  });
  return res.data;
};
export const findUser = async(data: any)=>{
  const res = await API.get('user/findUser', data);
  return res.data;
}
export const createReport = async(data: any)=>{
  const res = await API.post('/user/createReport', data);
  return res.data;
}
export const logoutAPI = async () => {
  try {
    const res = await API.post('/user/logout'); 
    return res.data;
  } catch (error: any) {
    console.error("Lỗi gọi API logout:", error.message);
    throw error;
  }
};

// ── ZUSTAND STORE ─────────────────────────────────────────────────────
export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,

  setLogin: (accessToken: string) => {
    try {
      const decoded: UserPayload = jwtDecode(accessToken);
      set({
        isLoggedIn: true,
        user: {
          id: decoded.userId,
          role: decoded.roleId,
          name: decoded.fullName,
          exp: decoded.exp,
          avatarUrl: decoded.avatarUrl,
        }
      });
    } catch (e) {
      console.error("Lỗi giải mã token:", e);
    }
  },

  checkAuth: async () => {
    const token = Platform.OS === 'web' 
      ? Cookies.get('accessToken') 
      : await SecureStore.getItemAsync('accessToken');
    
    if (token) {
      try {
        const decoded: UserPayload = jwtDecode(token);
        set({
          isLoggedIn: true,
          user: {
            id: decoded.userId,
            role: decoded.roleId,
            name: decoded.fullName,
            exp: decoded.exp,
          }
        });
      } catch (e) {
        console.error(e);
        set({ isLoggedIn: false, user: null });
      }
    } else {
      set({ isLoggedIn: false, user: null });
    }
  },
  
  logout: async () => {
    try {
      await logoutAPI();
    } catch (e) {
      console.warn("Backend logout failed or already logged out:", e);
    } finally {
      await removeStorage('accessToken');
      await removeStorage('refreshToken');

      set({ 
        isLoggedIn: false, 
        user: null 
      });

      console.log("Đã đăng xuất và xóa sạch session.");
    }
  },

  getUserInfor: async () => {
    try {
      const data = await getUserInfoAPI();
      
      set((state) => ({
        user: state.user ? {
          ...state.user,
          name: data.data.full_name,
          avatarUrl: data.data.avatar_url,
          phoneNumber: data.data.phone,
          role: data.data.role_id,
        } : null
      }));
    } catch (e) {
      console.error("Không thể lấy thông tin chi tiết user:", e);
    }
  },

  updateUserInfor: async (updateData: any) => {
    try {
      const res = await updateUserInfoAPI(updateData);
      const updatedData = res.data || res; 

      // Nếu Backend trả về token mới sau khi cập nhật thông tin/quyền hạn:
      if (updatedData.accessToken || updatedData.token) {
        const newToken = updatedData.accessToken || updatedData.token;
        await saveStorage('accessToken', newToken);
        
        if (updatedData.refreshToken) {
          await saveStorage('refreshToken', updatedData.refreshToken);
        }
      }

      set((state) => ({
        user: state.user ? {
          ...state.user,
          name: updatedData.full_name || updatedData.fullName,
          avatarUrl: updatedData.avatar_url || updatedData.avatarUrl,
          phoneNumber: updatedData.phone || updatedData.phoneNumber,
          role: updatedData.role_id || state.user.role 
        } : null
      }));
      
      return res;
    } catch (e) {
       throw e;
    }
  },

  clearSession: async () => {
    try {
      // Sử dụng hàm removeStorage dùng chung thay vì AsyncStorage lỗi import
      await removeStorage('accessToken');
      await removeStorage('refreshToken'); 
      
      set({ 
        isLoggedIn: false,
        user: null 
      });
      console.log("Đã chủ động clear session cục bộ.");
    } catch (e) {
      console.error("Lỗi khi xóa session:", e);
    }
  }
}));