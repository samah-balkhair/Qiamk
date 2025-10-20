import { Request, Response } from "express";
import * as db from "../db";

export async function cleanupSession(req: Request, res: Response) {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Clean up session data (keep final results)
    await db.cleanupSessionData(sessionId);

    return res.json({ success: true });
  } catch (error) {
    console.error("Error cleaning up session:", error);
    return res.status(500).json({ error: "Failed to cleanup session" });
  }
}

