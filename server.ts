import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";

interface MetricRow {
  id: string;
  timestamp: string;
  metric_type: string;
  value: number | string;
  source?: string;
}

interface SleepRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_sleep_mins: number;
  deep_sleep_mins: number;
  sleep_score: number;
  stages_json: string;
}

interface PaiRow {
  id: string;
  date: string;
  total_pai: number;
  daily_pai: number;
}

interface WebhookLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  payload: any;
  status: number;
}

// In-Memory Storage (representing Google BigQuery `zepp_health_data` dataset)
const DATASET_ID = "zepp_health_data";
const metricsTable: MetricRow[] = [
  { id: "m-1", timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), metric_type: "heart_rate", value: 72, source: "Amazfit GTR 4" },
  { id: "m-2", timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), metric_type: "steps", value: 4320, source: "Amazfit GTR 4" },
  { id: "m-3", timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), metric_type: "heart_rate", value: 78, source: "Amazfit GTR 4" },
  { id: "m-4", timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), metric_type: "steps", value: 7850, source: "Amazfit GTR 4" },
  { id: "m-5", timestamp: new Date(Date.now() - 1800000).toISOString(), metric_type: "heart_rate", value: 68, source: "Amazfit GTR 4" }
];

const sleepTable: SleepRow[] = [
  {
    id: "s-1",
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    start_time: "23:15:00",
    end_time: "07:05:00",
    total_sleep_mins: 470,
    deep_sleep_mins: 110,
    sleep_score: 87,
    stages_json: JSON.stringify([
      { stage: "deep", minutes: 110 },
      { stage: "light", minutes: 240 },
      { stage: "rem", minutes: 95 },
      { stage: "awake", minutes: 25 }
    ])
  },
  {
    id: "s-2",
    date: new Date().toISOString().slice(0, 10),
    start_time: "23:40:00",
    end_time: "06:55:00",
    total_sleep_mins: 435,
    deep_sleep_mins: 92,
    sleep_score: 83,
    stages_json: JSON.stringify([
      { stage: "deep", minutes: 92 },
      { stage: "light", minutes: 235 },
      { stage: "rem", minutes: 88 },
      { stage: "awake", minutes: 20 }
    ])
  }
];

const paiTable: PaiRow[] = [
  {
    id: "p-1",
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    total_pai: 82,
    daily_pai: 14
  },
  {
    id: "p-2",
    date: new Date().toISOString().slice(0, 10),
    total_pai: 94,
    daily_pai: 12
  }
];

const webhookLogs: WebhookLog[] = [];

function logWebhook(endpoint: string, method: string, payload: any, status: number) {
  webhookLogs.unshift({
    id: "log-" + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    endpoint,
    method,
    payload,
    status
  });
  if (webhookLogs.length > 50) {
    webhookLogs.pop();
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // === 1. ORIGINAL PYTHON FLASK RECEIVER ENDPOINTS ===

  // Health check endpoint (replicates receiver.py @app.route('/health'))
  app.get("/health", (req, res) => {
    res.json({
      status: "online",
      message: "Zepp Oracle Receiver is running",
      server_time: new Date().toISOString(),
      bigquery_target_dataset: DATASET_ID,
      port: PORT
    });
  });

  // Metrics endpoint (replicates receiver.py @app.route('/health/metrics'))
  app.post("/health/metrics", (req, res) => {
    try {
      const data = req.body || {};
      const newRow: MetricRow = {
        id: "m-" + Math.random().toString(36).substring(2, 9),
        timestamp: data.timestamp || new Date().toISOString(),
        metric_type: data.type || "unknown",
        value: data.value ?? 0,
        source: data.device || "Zepp-Device"
      };

      metricsTable.unshift(newRow);
      logWebhook("/health/metrics", "POST", data, 200);

      res.status(200).json({ status: "success", inserted_id: newRow.id });
    } catch (e: any) {
      logWebhook("/health/metrics", "POST", req.body, 400);
      res.status(400).json({ status: "error", message: e.message });
    }
  });

  // Sleep endpoint (replicates receiver.py @app.route('/health/sleep'))
  app.post("/health/sleep", (req, res) => {
    try {
      const data = req.body || {};
      const newRow: SleepRow = {
        id: "s-" + Math.random().toString(36).substring(2, 9),
        date: data.date || new Date().toISOString().slice(0, 10),
        start_time: data.start_time || "00:00:00",
        end_time: data.end_time || "07:00:00",
        total_sleep_mins: Number(data.total_time) || 0,
        deep_sleep_mins: Number(data.deep_time) || 0,
        sleep_score: Number(data.score) || 0,
        stages_json: JSON.stringify(data.stages || [])
      };

      sleepTable.unshift(newRow);
      logWebhook("/health/sleep", "POST", data, 200);

      res.status(200).json({ status: "success", inserted_id: newRow.id });
    } catch (e: any) {
      logWebhook("/health/sleep", "POST", req.body, 400);
      res.status(400).json({ status: "error", message: e.message });
    }
  });

  // PAI endpoint (replicates receiver.py @app.route('/health/pai'))
  app.post("/health/pai", (req, res) => {
    try {
      const data = req.body || {};
      const newRow: PaiRow = {
        id: "p-" + Math.random().toString(36).substring(2, 9),
        date: data.date || new Date().toISOString().slice(0, 10),
        total_pai: Number(data.total_pai) || 0,
        daily_pai: Number(data.daily_pai) || 0
      };

      paiTable.unshift(newRow);
      logWebhook("/health/pai", "POST", data, 200);

      res.status(200).json({ status: "success", inserted_id: newRow.id });
    } catch (e: any) {
      logWebhook("/health/pai", "POST", req.body, 400);
      res.status(400).json({ status: "error", message: e.message });
    }
  });

  // Combined Watch SideService Webhook (replicates zepp-mini-program/app-side/index.js POST /data)
  app.post("/data", (req, res) => {
    try {
      const data = req.body || {};
      const nowIso = data.timestamp || new Date().toISOString();
      const today = nowIso.slice(0, 10);

      // 1. Insert Heart Rate if present
      if (data.heart_rate !== undefined && data.heart_rate !== null) {
        metricsTable.unshift({
          id: "m-" + Math.random().toString(36).substring(2, 9),
          timestamp: nowIso,
          metric_type: "heart_rate",
          value: data.heart_rate,
          source: data.device || "Zepp-Watch"
        });
      }

      // 2. Insert PAI if present
      if (data.pai_total !== undefined && data.pai_total !== null) {
        paiTable.unshift({
          id: "p-" + Math.random().toString(36).substring(2, 9),
          date: today,
          total_pai: Number(data.pai_total) || 0,
          daily_pai: Number(data.daily_pai) || 5
        });
      }

      // 3. Insert Sleep if present
      if (data.sleep_score !== undefined && data.sleep_score !== null) {
        sleepTable.unshift({
          id: "s-" + Math.random().toString(36).substring(2, 9),
          date: today,
          start_time: "23:30:00",
          end_time: "07:00:00",
          total_sleep_mins: 450,
          deep_sleep_mins: 95,
          sleep_score: Number(data.sleep_score) || 0,
          stages_json: JSON.stringify([{ stage: "sync", time: nowIso }])
        });
      }

      logWebhook("/data", "POST", data, 200);

      // SideService expects: res(null, { success: true, message: 'Data synced to Oracle' })
      res.status(200).json({
        success: true,
        message: "Data synced to Oracle",
        stored_in_bigquery: true,
        dataset: DATASET_ID
      });
    } catch (e: any) {
      logWebhook("/data", "POST", req.body, 400);
      res.status(400).json({ success: false, message: e.message });
    }
  });

  // === 2. INSPECTION & UI API ROUTES ===

  app.get("/api/tables", (req, res) => {
    res.json({
      dataset_id: DATASET_ID,
      tables: {
        metrics_history: {
          name: `${DATASET_ID}.metrics_history`,
          rowCount: metricsTable.length,
          schema: ["id STRING", "timestamp TIMESTAMP", "metric_type STRING", "value FLOAT64/STRING", "source STRING"],
          data: metricsTable.slice(0, 30)
        },
        sleep_history: {
          name: `${DATASET_ID}.sleep_history`,
          rowCount: sleepTable.length,
          schema: ["id STRING", "date DATE", "start_time TIME", "end_time TIME", "total_sleep_mins INT64", "deep_sleep_mins INT64", "sleep_score INT64", "stages_json STRING"],
          data: sleepTable.slice(0, 20)
        },
        pai_history: {
          name: `${DATASET_ID}.pai_history`,
          rowCount: paiTable.length,
          schema: ["id STRING", "date DATE", "total_pai INT64", "daily_pai INT64"],
          data: paiTable.slice(0, 20)
        }
      },
      webhook_logs: webhookLogs.slice(0, 25),
      receiver_info: {
        status: "online",
        port: PORT,
        host: "0.0.0.0",
        gcp_project: process.env.GCP_PROJECT_ID || "oracle-sync-demo",
        dataset: DATASET_ID,
        uptime_seconds: Math.floor(process.uptime())
      }
    });
  });

  app.post("/api/reset", (req, res) => {
    metricsTable.length = 0;
    sleepTable.length = 0;
    paiTable.length = 0;
    webhookLogs.length = 0;
    res.json({ success: true, message: "Tables reset" });
  });

  // === 3. VITE MIDDLEWARE (DEV) & STATIC SERVING (PROD) ===
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Zepp Health Extractor Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
