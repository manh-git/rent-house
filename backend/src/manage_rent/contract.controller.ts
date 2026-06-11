import { Request, Response } from 'express';
import * as ContractService from './contract.service.js'
import { verifyVNPayReturn } from '../utils/vnpay.util.js';
export const createContract = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).user.userId;
    const result = await ContractService.createContract(ownerId, req.body);
    res.status(201).json(result);
  } catch (err: any) {
    
    res.status(400).json({ code: 400, message: err.message });
  }
};

export const getContract = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const contractId = Number(req.params.contractId);
    const result = await ContractService.getContract(contractId, userId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message });
  }
};

export const tenantConfirm = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user.userId;
    const contractId = Number(req.params.contractId);
    const result = await ContractService.tenantConfirm(contractId, tenantId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message });
  }
};



export const requestSignOTP = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const contractId = Number(req.params.contractId);
    const result = await ContractService.requestSignOTP(contractId, userId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message });
  }
};

export const signContract = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const contractId = Number(req.params.contractId);
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const { otp } = req.body;
    const result = await ContractService.signContract(contractId, userId, otp, ip);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message });
  }
};

export const confirmDeposit = async (req: Request, res: Response) => {
  try {
    const contractId = Number(req.params.contractId);
    const result = await ContractService.confirmDeposit(contractId, req.body);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message });
  }
};

export const cancelContract = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const contractId = Number(req.params.contractId);
    const { reason } = req.body;
    const result = await ContractService.cancelContract(contractId, userId, reason);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message });
  }
};

import { getVNPayMessage } from '../utils/vnpay.util.js';

export const createDepositPaymentUrl = async (req: Request, res: Response) => {
  try {
    
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' 
      ? forwarded.split(',')[0] 
      : (req.socket.remoteAddress || '127.0.0.1');
    const finalIp = ip === '::1' || ip === '127.0.0.1' ? '113.160.100.100' : ip;
    const tenantId = (req as any).user.userId;
    
    const contractId = Number(req.params.contractId);
    const result = await ContractService.createDepositPaymentUrl(contractId, tenantId, finalIp);
    res.status(200).json(result);
    
  } catch (err: any) {
    console.error(err)
    res.status(400).json({ code: 400, message: err.message });
  }
};

export const vnpayReturn = async (req: Request, res: Response) => {

  try {
    const query = req.query as Record<string, string>;
    const result = await ContractService.handleVNPayReturn(query);

    if (result.code === 1000) {
      // Redirect về app với success
      res.redirect(`${process.env.CLIENT_URL}/contract/payment-success?contractId=${result.data.contract?.contract_id}`);
    } else {
      res.redirect(`${process.env.CLIENT_URL}/contract/payment-failed?message=${encodeURIComponent(result.message)}`);
    }
  } catch (err: any) {
    console.error(err)
    res.redirect(`${process.env.CLIENT_URL}/contract/payment-failed?message=${encodeURIComponent(err.message)}`);
  }
};

export const vnpayIPN = async (req: Request, res: Response) => {
    console.log('test 2522')

  try {

    const queryData = req.query || {};

    console.log('Dữ liệu nhận được:', queryData);
    
    const query = queryData as Record<string, string>;
    const result = verifyVNPayReturn(query);
    

    if (!result.isValid) {
      res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
      return;
    }

    if (!result.isSuccess) {
      res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
      return;
    }

    await ContractService.handleVNPayReturn(query);
    res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  } catch(e) {
    console.error(e)
    res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

export const submitWithdrawalRequest = async (req: Request, res: Response) => {
  const { contract_id, bank_name, account_number, account_holder, request_id } = req.body;
  const data = {
      contract_id, bank_name, account_holder, account_number
    };
    const userId = (req as any).user.userId;
  try {

    let result;
    if (request_id) {
      result = await ContractService.updateWithdrawalRequest(request_id, data);
    } else {
      result = await ContractService.submitWithdrawalRequest(data);
    }
    res.json({ code: 1000, result });
  } catch (err) { 
    const error = err as Error;
    console.error(error.message);
    return res.status(400).json({ message: error.message || "Đã có lỗi xảy ra!" }); 
  }
};
export const getWithdrawalRequest = async (req: Request, res: Response) => {
  try {
    const contractId = Number(req.params.contractId);
    const result = await ContractService.getWithdrawalRequest(contractId);
    res.json({ code: 1000, data: result });
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message });
  }
};



export const getMyContractsController = async (req: any, res: any) => {
  try {

    const userId = (req as any).user.userId; // Lấy từ middleware xác thực
    const contracts = await ContractService.getContractsByUser(userId);
    const asOwner = contracts.filter(c => c.room.owner_id === userId);
    const asTenant = contracts.filter(c => c.tenant_id === userId);

    res.status(200).json({ 
      code: 1000, 
      data: {
        all: contracts,
        asOwner,
        asTenant
      } 
    });
  } catch (error: any) {
    res.status(400).json({ code: 9999, message: error.message });
  }
};

