export interface MetricRow {
  id: string;
  timestamp: string;
  metric_type: string;
  value: number | string;
  source?: string;
}

export interface SleepRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_sleep_mins: number;
  deep_sleep_mins: number;
  sleep_score: number;
  stages_json: string;
}

export interface PaiRow {
  id: string;
  date: string;
  total_pai: number;
  daily_pai: number;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  payload: any;
  status: number;
}

export interface TableResponse {
  dataset_id: string;
  tables: {
    metrics_history: {
      name: string;
      rowCount: number;
      schema: string[];
      data: MetricRow[];
    };
    sleep_history: {
      name: string;
      rowCount: number;
      schema: string[];
      data: SleepRow[];
    };
    pai_history: {
      name: string;
      rowCount: number;
      schema: string[];
      data: PaiRow[];
    };
  };
  webhook_logs: WebhookLog[];
  receiver_info: {
    status: string;
    port: number;
    host: string;
    gcp_project: string;
    dataset: string;
    uptime_seconds: number;
  };
}
