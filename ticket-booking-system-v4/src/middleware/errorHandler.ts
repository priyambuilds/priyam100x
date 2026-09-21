import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
    return res.status(500).json({
        success: false,
        messaage: "Internal server error",
        data: []
    })
}