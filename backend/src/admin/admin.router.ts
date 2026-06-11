import express from 'express';
import * as AdminController from './admin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
const router = express.Router();

// Tất cả route trong này cần quyền admin
router.use(authenticate);

// Quản lý người dùng
router.post('/user/lock', authorize(3,5), AdminController.deleteUser);
router.post('/user/unlock', authorize(3,5), AdminController.openUser);
router.put('/user/role', authorize(5), AdminController.updateRole);
router.get('/user/search', authorize(3,5), AdminController.searchUsers);
router.get('/user/activities/:targetId', authorize(4,5), AdminController.getUserActivities);

// Quản lý nội dung
router.post('/review/delete', authorize(3,5), AdminController.deleteReview);
router.post('/post/delete', authorize(3,5), AdminController.deletePostRoom);
router.post('/postRoommate/delete', authorize(3,5), AdminController.deleteRoommate);
// Quản lý hệ thống & tài chính
router.get('/logs',authorize(3,5), AdminController.getAdminLogs);
router.get('/withdrawals', authorize(3,5), AdminController.getWithdrawalList);
router.put('/withdrawal/status', authorize(3,5), AdminController.updateWithdrawal);

export default router;