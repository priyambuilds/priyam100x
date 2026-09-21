import type { RequestHandler } from "express";

export const requireAdmin: RequestHandler = (req, res, next) => {
    if (req.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Admin access required",
            data: []
        })
    }
    next()
}