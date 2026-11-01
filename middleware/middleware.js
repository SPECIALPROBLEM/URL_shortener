import { randomUUID } from "crypto";

const authenticator = (req, res, next) => {
    let id = req.cookies.visitorId;
    if (!id) {
        id = randomUUID();
        res.cookie("visitorId", id, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
         });
    }
    req.visitorId = id;
    next();
}



export default authenticator


