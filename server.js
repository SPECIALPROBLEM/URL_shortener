import express from "express";

import { nanoid } from "nanoid";
import pool from "./config/db.js";
import cookieParser from "cookie-parser";


import authenticator from "./middleware/middleware.js";


const app = express();
app.use(cookieParser());

app.use(express.static("public"));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(authenticator);


app.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM short_urls WHERE owner_id = ?",
            [req.visitorId]
        );

        console.log(rows); // Temporary debugging

        const shortUrls = rows.map(row => ({
            full: row.full_url,
            short: `${req.protocol}://${req.get("host")}/${row.short_code}`,
            clicks: row.clicks
        })); 

        res.render("index", { shortUrls });

    } catch (error) {
        console.error("Error loading URLs:", error);
        res.status(500).send("Error loading URLs");
    }
});
app.post("/shortUrls", async (req, res) => {
   const fullUrl = req.body.fullUrl;
     
    if (!fullUrl) {
        return res.redirect("/");
    }
    try {
        const shortCode = nanoid(6);
        await pool.query(
            "INSERT INTO short_urls (full_url, short_code, owner_id) VALUES(?, ?, ?)",
            [fullUrl, shortCode, req.visitorId]
        );
        res.redirect("/");


        
        
    } catch (error) {
        console.error("Error generating short URL:", error);
        res.status(500).send("Internal Server Error");
    }
});


// Redirect to the original URL
app.get("/:shortCode", async (req, res) => {
    try {
        const { shortCode } = req.params;

        // Find the original URL in the database
        const [rows] = await pool.query(
            "SELECT full_url FROM short_urls WHERE owner_id = ?",
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




