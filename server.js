import express from "express";

import { nanoid } from "nanoid";
import pool from "./config/db.js";

import bcrypt from "bcrypt";


import { requireLogin, sessionMiddleware } from "./middleware/middleware.js";
import signin from "./routes/login_route";




const app = express();


app.use(express.static("public"));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(sessionMiddleware);



app.get("/", requireLogin, signin);


app.post("/shortUrls", async (req, res) => {
   const fullUrl = req.body.fullUrl;
     
    if (!fullUrl) {
        return res.redirect("/");
    }
    try {
        const shortCode = nanoid(6);
        await pool.query(
            "INSERT INTO short_urls (full_url, short_code, owner_id) VALUES(?, ?, ?)",
            [fullUrl, shortCode, req.session.userId]
        );
        res.redirect("/");


        
        
    } catch (error) {
        console.error("Error generating short URL:", error);
        res.status(500).send("Internal Server Error");
    }
});


app.get("/register", (req, res) => res.render("register", { error: null }));

app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || password.length < 6) {
        return res.render("register", { error: "Enter a username and a password of 6+ characters" });
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            [username.trim(), hash]
        );
        req.session.userId = result.insertId;
        res.redirect("/");
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.render("register", { error: "Username already taken" });
        }
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.get("/login", (req, res) => res.render("login", { error: null }));

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
        const user = rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.render("login", { error: "Invalid username or password" });
        }
        req.session.userId = user.id;
        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.post("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});


// Redirect to the original URL
app.get("/:shortCode", async (req, res) => {
    try {
        const { shortCode } = req.params;

        // Find the original URL in the database
        const [rows] = await pool.query(
            "SELECT full_url FROM short_urls WHERE short_code = ?",
            [shortCode  ]
        );

        // Check whether the short code exists
        if (rows.length === 0) {
            return res.status(404).send("Short URL not found");
        }

        // Increase the click count
        await pool.query(
            "UPDATE short_urls SET clicks = clicks + 1 WHERE short_code = ?",
            [shortCode]
        );

        // Redirect to the original URL
        return res.redirect(rows[0].full_url);

    } catch (error) {
        console.error("Redirect error:", error);
        return res.status(500).send("Internal Server Error");
    }
});

app.listen(process.env.PORT || 3000);




