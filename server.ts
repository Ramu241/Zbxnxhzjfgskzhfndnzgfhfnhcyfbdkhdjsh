import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Real-time Wingo Period endpoint fallback
app.get("/api/game-issue", async (_req, res) => {
  try {
    // Try external API
    const apiRes = await fetch("https://api.bdg88zf.com/api/webapi/GetGameIssue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
      },
      body: JSON.stringify({
        typeId: 1,
        language: 0,
        random: "40079dcba93a48769c6ee9d4d4fae23f",
        signature: "D12108C4F57C549D82B23A91E0FA20AE",
        timestamp: Math.floor(Date.now() / 1000)
      })
    });
    
    const data = await apiRes.json();
    if (data && data.code === 0 && data.data) {
      return res.json(data);
    }
  } catch (e) {
    // Fallback live calculation if external API blocked
  }

  // Calculate standard 1-minute Wingo period string
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + 1;
  const issueStr = `${yyyy}${mm}${dd}1000${String(totalMinutes).padStart(4, "0")}`;

  res.json({
    code: 0,
    msg: "success",
    data: {
      issueNumber: issueStr
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
