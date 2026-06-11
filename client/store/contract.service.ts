import { API } from '@/store/authStore';

export const createContractAPI = async (data: {
  room_id: number;
  tenant_id: number;
  start_date: string;
  end_date?: string;
  monthly_rent: number;
  deposit_amount: number;
  payment_due_day?: number;
  draft_data?: any;
}) => {
  const res = await API.post('/contract', data);
  return res.data;
};

export const getContractAPI = async (contractId: number) => {
  const res = await API.get(`/contract/${contractId}`);
  return res.data;
};

export const tenantConfirmAPI = async (contractId: number) => {
  const res = await API.post(`/contract/${contractId}/tenant-confirm`);
  return res.data;
};

export const requestSignOTPAPI = async (contractId: number) => {
  const res = await API.post(`/contract/${contractId}/request-sign-otp`);
  return res.data;
};

export const signContractAPI = async (contractId: number, otp: string) => {
  const res = await API.post(`/contract/${contractId}/sign`, { otp });
  return res.data;
};

export const createPaymentUrlAPI = async (contractId: number) => {
  const res = await API.post(`/contract/${contractId}/payment-url`);
  return res.data;
};

export const cancelContractAPI = async (contractId: number, reason: string) => {
  const res = await API.post(`/contract/${contractId}`, { reason });
  return res.data;
};

export const findUserAPI = async(key: string)=>{
  const res = await API.get('user/findUser', { 
    params: { key: key } 
  });
  return res.data;
}
export const submitAPI = async(data: any )=>{
  const res = await API.post('contract/withdraw/submit', data);
  return res.data;
}


export const getWithdrawalRequestAPI = async (contractId: number) => {
  const res = await API.get(`/contract/withdrawal/${contractId}`);
  return res.data; 
};

export const updateWithdrawalRequestAPI = async (requestId: number, data: any) => {
  const res = await API.post('contract/withdraw/submit', { ...data, request_id: requestId });
  return res.data;
};
