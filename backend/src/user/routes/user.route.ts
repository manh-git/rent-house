import { Router } from "express";
import * as UserController from "../controllers/user.controllers.js"
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", UserController.register);
router.get("/confirm-email", UserController.confirmEmail);
router.post("/login", UserController.login);
router.post("/logout", UserController.logout);
router.post("/refresh-token", UserController.refreshToken);
router.post("/change-password", authenticate, UserController.changePassword);
router.post("/forgot-password", UserController.forgotPassword);
router.post("/reset-password", UserController.resetPassword);
router.post("/resend-otp", UserController.resentOtp);
//get/update user_infor 
router.put('/updateInfor', authenticate, UserController.updateUserInfor);
router.get('/getUserInfor', authenticate, UserController.getUserInfor);
//google
router.post('/google', UserController.loginGoogle);

router.post('/createReport', authenticate, UserController.createReport);
router.get('/findUser', authenticate, UserController.findUser);
export default router;