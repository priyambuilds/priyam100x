import jwt from "jsonwebtoken";

function authMiddleWare(req, res, next) {
    const token = req.headers.token;
    if (!token) {
        return res.status(401).json({message: "Unauthorized"})
    }
    
    try {
        const decoded = jwt.verify(token, "ultrasupersecretpassword123");
        const userId = decoded.userId;
        req.userId = userId;
        next();
    }
    catch (err) {
        return res.status(401).json({message: "Unauthorized"})
    }
}

export {authMiddleWare};