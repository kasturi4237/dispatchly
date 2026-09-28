import { Response, NextFunction } from "express";
import { AuthedRequest } from "../types";
import { createCampaignSchema, pageQuerySchema } from "../validators/campaignValidators";
import { launchCampaign, fetchUpcoming, fetchDelivered, fetchOne, fetchStats } from "../services/campaignService";

export async function postCampaign(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createCampaignSchema.parse(req.body);
    const result = await launchCampaign(req.user!.id, input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUpcoming(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = pageQuerySchema.parse(req.query);
    const data = await fetchUpcoming(req.user!.id, query.limit, query.offset, query.q);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getDelivered(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = pageQuerySchema.parse(req.query);
    const data = await fetchDelivered(req.user!.id, query.limit, query.offset, query.q);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const message = await fetchOne(req.user!.id, req.params.id);
    if (!message) {
      res.status(404).json({ error: { message: "Message not found" } });
      return;
    }
    res.json({ message });
  } catch (err) {
    next(err);
  }
}

export async function getStats(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await fetchStats(req.user!.id);
    res.json({ stats });
  } catch (err) {
    next(err);
  }
}
