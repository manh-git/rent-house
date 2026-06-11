import { Router } from "express";
import * as RoomsController from "../controllers/rooms.controllers.js"
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/role.middleware.js";
import multer from 'multer';
import { auth } from "google-auth-library";
const upload = multer();
const router = Router();

router.post("/rooms", authenticate,authorize(2), upload.none(),RoomsController.createRooms);
router.put("/rooms", authenticate,authorize(2),upload.none(),RoomsController.updateRooms);
router.delete("/rooms/:room_id",authenticate, authorize(2), RoomsController.deleteRooms);

router.get("/getlistpost" ,RoomsController.getListRoom);
router.get("/getroom/:post_id", RoomsController.getRooms);
router.get("/ward", authenticate, RoomsController.getWard);
router.get("/getlistpost1", authenticate, RoomsController.getListPostOwner);
export default router;