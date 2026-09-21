import type { RequestHandler } from "express";
import type { z } from "zod";

export function validateBody(schema: z.ZodType): RequestHandler {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            })
        }
        req.body = result.data;
        next()
    }
}