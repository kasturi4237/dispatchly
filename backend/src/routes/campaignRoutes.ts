import { Router } from "express";
import { requireSession } from "../middleware/requireSession";
import { postCampaign, getUpcoming, getDelivered, getOne, getStats } from "../controllers/campaignController";

export const campaignRoutes = Router();

campaignRoutes.use(requireSession);
campaignRoutes.get("/stats", getStats);
campaignRoutes.get("/upcoming", getUpcoming);
campaignRoutes.get("/delivered", getDelivered);
campaignRoutes.get("/:id", getOne);
campaignRoutes.post("/", postCampaign);
