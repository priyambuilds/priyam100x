import { type Request, type Response, type NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      role: string;
    }
  }
}


function authMiddleWare(req: Request, res: Response, next: NextFunction) {
  const headerToken = req.headers.authorization;

  if (!headerToken || !headerToken.startsWith("Bearer")) {
    return res.status(401).json({
      success: false,
      message: "Malformed token",
    });
  }

  const token = headerToken?.split(" ")[1];

  if (typeof token !== "string") {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      "ultrasupersecretpassword123",
    ) as JwtPayload;

    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
}

export { authMiddleWare };
