
import session from "express-session";
export const sessionMiddleware=session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 7 }
});

export function requireLogin(req, res, next) {
    if (!req.session.userId) return res.redirect("/login");
    next();
}



