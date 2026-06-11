import { Router } from "express";
import * as RoommateController from "../controllers/roommate.controller.js"
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/role.middleware.js";

const router = Router();

router.post("/rooms", authenticate,authorize(1),RoommateController.createRoommate);
router.put("/rooms", authenticate,authorize(1),RoommateController.updateRoommate);
router.delete("/rooms/:room_id",authenticate, authorize(1), RoommateController.deleteRoommate);

router.get("/getlistpost",authenticate ,RoommateController.getListRoommate);
router.get("/getlistpost1", authenticate, RoommateController.getListRoommateOwner);
export default router;