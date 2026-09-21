import type { RequestHandler } from "express";
import type { z } from "zod";

export function validateParams(schema: z.ZodType): RequestHandler {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error,
                data: []
            })
        }
        req.params = result.data as typeof req.params;
        next()
    }
}