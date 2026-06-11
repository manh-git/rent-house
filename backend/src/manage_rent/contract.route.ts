import * as ContractController from './contract.controller.js';

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
const router = Router();
router.all('/vnpay-ipn', ContractController.vnpayIPN);             // IPN webhook


router.get('/vnpay-return', ContractController.vnpayReturn);       // callback redirect
router.post('/withdraw/submit', authenticate, authorize(1,2), ContractController.submitWithdrawalRequest);
router.get('/withdrawal/:contractId', authenticate, ContractController.getWithdrawalRequest);
router.get('/my-list', authenticate, ContractController.getMyContractsController);

router.post('/', authenticate, ContractController.createContract);
router.get('/:contractId', authenticate, ContractController.getContract);
router.post('/:contractId/tenant-confirm', authenticate, ContractController.tenantConfirm);
router.post('/:contractId/request-sign-otp', authenticate, ContractController.requestSignOTP);
router.post('/:contractId/sign', authenticate, ContractController.signContract);
router.post('/:contractId/confirm-deposit', authenticate, ContractController.confirmDeposit);
router.post('/:contractId', authenticate, ContractController.cancelContract);
router.post('/:contractId/payment-url', authenticate, ContractController.createDepositPaymentUrl);

export default router;