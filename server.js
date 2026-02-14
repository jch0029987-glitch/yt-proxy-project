/**
 * SmartTube-Style Roku Backend (2026 Safe Version)
 * -----------------------------------------------
 * Features:
 *  - Trending (search-based, not blocked)
 *  - Search
 *  - Video playback (HLS for Roku)
 *  - Live stream detection
 *  - Channel live auto-detect
 *  - Proxy support (HTTP / SOCKS / per-request)
 */

const express = require("express");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 8000;

/* ==============================
   PROXY SUPPORT
============================== */

function getProxyArg(req) {
  if (req.query.proxy) return `--proxy ${req.query.proxy}`;
  if (process.env.SOCKS_PROXY) return `--proxy ${process.env.SOCKS_PROXY}`;
  if (process.env.HTTP_PROXY) return `--proxy ${process.env.HTTP_PROXY}`;
  return "";
}

/* ==============================
   RUN yt-dlp HELPER
============================== */

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error("yt-dlp error:", stderr);
        return reject(stderr);
      }
      resolve(stdout.trim());
    });
  });
}

/* ==============================
   TRENDING (SAFE)
============================== */

app.get("/api/trending", async (req, res) => {
  try {
    // Search-based trending (works everywhere)
    const cmd = `yt-dlp "ytsearch20:trending videos US" --flat-playlist --print "%(id)s|%(title)s|%(thumbnail)s"`;
    const out = await run(cmd);

    const data = out.split("\n")
      .map(line => {
        const [id, title, thumb] = line.split("|");
        return { id, title, thumb };
      })
      .filter(v => v.id);

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Trending failed" });
  }
});

/* ==============================
   LIVE NOW ROW
============================== */

app.get("/api/live-now", async (req, res) => {
  try {
    const cmd = `yt-dlp "ytsearch15:live now" --flat-playlist --print "%(id)s|%(title)s|%(thumbnail)s"`;
    const out = await run(cmd);

    const data = out.split("\n").map(line => {
      const [id, title, thumb] = line.split("|");
      return { id, title, thumb };
    }).filter(v => v.id);

    res.json(data);
  } catch {
    res.status(500).json({ error: "Live failed" });
  }
});

/* ==============================
   SEARCH
============================== */

app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q || "news";
    const cmd = `yt-dlp "ytsearch20:${q}" --flat-playlist --print "%(id)s|%(title)s|%(thumbnail)s"`;
    const out = await run(cmd);

    const data = out.split("\n").map(line => {
      const [id, title, thumb] = line.split("|");
      return { id, title, thumb };
    }).filter(v => v.id);

    res.json(data);
  } catch {
    res.status(500).json({ error: "Search failed" });
  }
});

/* ==============================
   VIDEO STREAM (Roku Friendly)
============================== */

app.get("/api/video/:id", async (req, res) => {
  try {
    const proxyArg = getProxyArg(req);
    const id = req.params.id;

    const cmd = `yt-dlp ${proxyArg} -g -f "best[ext=m3u8]/best" https://youtube.com/watch?v=${id}`;
    const stream = await run(cmd);

    res.json({
      id,
      stream,
      type: "video"
    });
  } catch {
    res.status(500).json({ error: "Stream failed" });
  }
});

/* ==============================
   LIVE STREAM DETECTION
============================== */

app.get("/api/live/:id", async (req, res) => {
  try {
    const proxyArg = getProxyArg(req);
    const id = req.params.id;

    const infoCmd = `yt-dlp -J https://youtube.com/watch?v=${id}`;
    const info = JSON.parse(await run(infoCmd));

    if (!info.is_live) {
      return res.json({ live: false });
    }

    const streamCmd = `yt-dlp ${proxyArg} -g -f "best[ext=m3u8]/best" https://youtube.com/watch?v=${id}`;
    const stream = await run(streamCmd);

    res.json({
      live: true,
      title: info.title,
      stream
    });
  } catch {
    res.status(500).json({ error: "Live check failed" });
  }
});

/* ==============================
   CHANNEL LIVE AUTO-DETECT
============================== */

app.get("/api/channel-live/:channel", async (req, res) => {
  try {
    const proxyArg = getProxyArg(req);
    const channel = req.params.channel;

    const cmd = `yt-dlp ${proxyArg} -g -f "best[ext=m3u8]/best" https://www.youtube.com/${channel}/live`;
    const stream = await run(cmd);

    res.json({ channel, stream });
  } catch {
    res.status(500).json({ error: "Channel live failed" });
  }
});

/* ==============================
   HEALTH CHECK
============================== */

app.get("/", (req, res) => {
  res.send("SmartTube Roku Backend Running ✅");
});

/* ==============================
   START SERVER
============================== */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SmartTube Backend running on port ${PORT}`);
});
