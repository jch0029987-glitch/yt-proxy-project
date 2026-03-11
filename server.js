/**
 * SmartTube-Style Roku/Android Backend (v2.0)
 * Optimized for Termux & Data Saving
 */

const express = require("express");
const { exec } = require("child_process");
const axios = require("axios"); // npm install axios

const app = express();
const PORT = process.env.PORT || 8000;

// Simple memory cache to save data/hotspot usage
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

/* ==============================
   UTILITIES
============================== */

function getProxyArg() {
  if (process.env.SOCKS_PROXY) return `--proxy ${process.env.SOCKS_PROXY}`;
  if (process.env.HTTP_PROXY) return `--proxy ${process.env.HTTP_PROXY}`;
  return "";
}

function run(cmd) {
  return new Promise((resolve, reject) => {
    // Increased buffer for large JSON responses from yt-dlp
    exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      resolve(stdout.trim());
    });
  });
}

/* ==============================
   SPONSORBLOCK INTEGRATION
============================== */

app.get("/api/skip/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Queries the public SponsorBlock API for skip segments
    const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${id}&categories=["sponsor","selfpromo","interaction","intro","outro"]`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (e) {
    res.json([]); // Return empty if no segments found
  }
});

/* ==============================
   ENHANCED FEED (Home/Trending)
============================== */

app.get("/api/feed/:type", async (req, res) => {
  const type = req.params.type || "trending";
  const cacheKey = `feed_${type}`;

  if (cache.has(cacheKey) && (Date.now() - cache.get(cacheKey).time < CACHE_TTL)) {
    return res.json(cache.get(cacheKey).data);
  }

  try {
    // Uses "InnerTube" (web) client via yt-dlp to get rich metadata
    const query = type === "trending" ? "trending" : type;
    const cmd = `yt-dlp "ytsearch25:${query}" --flat-playlist --print "%(id)s|%(title)s|%(thumbnail)s|%(duration_string)s|%(uploader)s"`;
    
    const out = await run(cmd);
    const data = out.split("\n").map(line => {
      const [id, title, thumb, duration, author] = line.split("|");
      return { id, title, thumb, duration, author };
    }).filter(v => v.id);

    cache.set(cacheKey, { time: Date.now(), data });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Feed fetch failed" });
  }
});

/* ==============================
   THE "SMARTTUBE" EXTRACTOR
============================== */

app.get("/api/video/:id", async (req, res) => {
  const { id } = req.params;
  const proxy = getProxyArg();

  try {
    // Extract formats and info in one go to save requests
    // Using --print to get exactly what the player needs
    const cmd = `yt-dlp ${proxy} -g -f "best[ext=m3u8]/best" https://youtube.com/watch?v=${id}`;
    const streamUrl = await run(cmd);

    res.json({
      id,
      url: streamUrl,
      // Pass back headers if needed for some players
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
  } catch (e) {
    res.status(500).json({ error: "Extraction failed" });
  }
});

/* ==============================
   SEARCH (Optimized)
============================== */

app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).send("Missing query");

  try {
    const cmd = `yt-dlp "ytsearch20:${q}" --flat-playlist --print "%(id)s|%(title)s|%(thumbnail)s|%(uploader)s"`;
    const out = await run(cmd);
    const data = out.split("\n").map(line => {
      const [id, title, thumb, author] = line.split("|");
      return { id, title, thumb, author };
    }).filter(v => v.id);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Search failed" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  🚀 Improved SmartTube Backend
  -----------------------------
  Port: ${PORT}
  Proxy: ${getProxyArg() || "None (Direct)"}
  Local URL: http://localhost:${PORT}
  `);
});
