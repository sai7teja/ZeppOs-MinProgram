import React, { useState } from 'react';
import { Server, Activity, Terminal, Send, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { WebhookLog } from '../types';

interface ReceiverStatusProps {
  receiverInfo: {
    status: string;
    port: number;
    host: string;
    gcp_project: string;
    dataset: string;
    uptime_seconds: number;
  };
  webhookLogs: WebhookLog[];
  onRefresh: () => void;
}

export const ReceiverStatus: React.FC<ReceiverStatusProps> = ({ receiverInfo, webhookLogs, onRefresh }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/health/metrics');
  const [customPayload, setCustomPayload] = useState<string>(
    JSON.stringify({ type: 'heart_rate', value: 84, timestamp: new Date().toISOString() }, null, 2)
  );
  const [isSending, setIsSending] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleEndpointSelect = (endpoint: string) => {
    setSelectedEndpoint(endpoint);
    if (endpoint === '/health/metrics') {
      setCustomPayload(
        JSON.stringify({ type: 'heart_rate', value: Math.floor(65 + Math.random() * 30), timestamp: new Date().toISOString() }, null, 2)
      );
    } else if (endpoint === '/health/sleep') {
      setCustomPayload(
        JSON.stringify(
          {
            date: new Date().toISOString().slice(0, 10),
            start_time: '23:30:00',
            end_time: '07:15:00',
            total_time: 465,
            deep_time: 105,
            score: 88,
            stages: [{ stage: 'deep', minutes: 105 }, { stage: 'rem', minutes: 90 }]
          },
          null,
          2
        )
      );
    } else if (endpoint === '/health/pai') {
      setCustomPayload(
        JSON.stringify({ total_pai: 105, daily_pai: 18 }, null, 2)
      );
    } else if (endpoint === '/data') {
      setCustomPayload(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          pai_total: 98,
          sleep_score: 82,
          heart_rate: 74,
          device: 'Amazfit Watch'
        }, null, 2)
      );
    }
  };

  const handleSendTestPayload = async () => {
    setIsSending(true);
    setTestResult(null);
    try {
      const parsed = JSON.parse(customPayload);
      const res = await fetch(selectedEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      setTestResult(`Status ${res.status}: ${JSON.stringify(data)}`);
      onRefresh();
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div id="receiver-status-panel" className="bg-neutral-800/70 border border-neutral-700/80 rounded-2xl p-6 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-neutral-100">Oracle Cloud Webhook Receiver</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="Refresh logs and status"
            className="p-1.5 rounded-lg bg-neutral-700/60 hover:bg-neutral-700 text-neutral-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            PORT 3000 • ONLINE
          </span>
        </div>
      </div>

      <p className="text-xs text-neutral-400 mb-4">
        Replaces <code className="text-neutral-300 bg-neutral-900 px-1 py-0.5 rounded">oracle-cloud-server/receiver.py</code> with full Node.js / Express compatibility.
      </p>

      {/* Receiver Specs Grid */}
      <div className="grid grid-cols-3 gap-2.5 mb-5 text-xs">
        <div className="bg-neutral-900/80 border border-neutral-700/60 rounded-xl p-3">
          <div className="text-neutral-400 text-[11px] mb-0.5">BigQuery Dataset</div>
          <div className="font-mono font-medium text-emerald-300 truncate">{receiverInfo.dataset}</div>
        </div>
        <div className="bg-neutral-900/80 border border-neutral-700/60 rounded-xl p-3">
          <div className="text-neutral-400 text-[11px] mb-0.5">Security Context</div>
          <div className="flex items-center gap-1 font-mono text-neutral-200 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>SA: zepp-bq-writer</span>
          </div>
        </div>
        <div className="bg-neutral-900/80 border border-neutral-700/60 rounded-xl p-3">
          <div className="text-neutral-400 text-[11px] mb-0.5">Uptime</div>
          <div className="font-mono text-neutral-200">{receiverInfo.uptime_seconds}s (Active)</div>
        </div>
      </div>

      {/* Interactive Webhook Dispatcher */}
      <div className="mb-5 bg-neutral-900/90 border border-neutral-700/70 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-sky-400" />
            Direct Endpoint Dispatcher
          </span>
          <div className="flex gap-1.5">
            {['/health/metrics', '/health/sleep', '/health/pai', '/data'].map((ep) => (
              <button
                key={ep}
                onClick={() => handleEndpointSelect(ep)}
                className={`text-[11px] px-2 py-0.5 rounded-md font-mono transition-colors ${
                  selectedEndpoint === ep
                    ? 'bg-sky-600 text-white font-medium'
                    : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {ep}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={customPayload}
          onChange={(e) => setCustomPayload(e.target.value)}
          rows={3}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs font-mono text-neutral-300 focus:outline-none focus:border-sky-500 mb-2 resize-none"
        />

        <div className="flex items-center justify-between">
          <button
            id="send-webhook-payload-btn"
            onClick={handleSendTestPayload}
            disabled={isSending}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            <span>{isSending ? 'Sending POST...' : `POST to ${selectedEndpoint}`}</span>
          </button>
          {testResult && (
            <span className="text-[11px] font-mono text-emerald-400 truncate max-w-xs">{testResult}</span>
          )}
        </div>
      </div>

      {/* Live Webhook Ingestion Log Terminal */}
      <div className="flex-1 flex flex-col min-h-48">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Ingestion Feed ({webhookLogs.length} events)</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">Streamed from HTTP Ingress</span>
        </div>

        <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-3 font-mono text-[11px] overflow-y-auto max-h-56 space-y-2">
          {webhookLogs.length === 0 ? (
            <div className="text-neutral-500 italic text-center py-6">
              Awaiting incoming health packets from Zepp watch or webhook dispatcher...
            </div>
          ) : (
            webhookLogs.map((log) => (
              <div key={log.id} className="border-b border-neutral-900/80 pb-1.5 last:border-0">
                <div className="flex items-center justify-between text-[10px] text-neutral-500">
                  <span className="text-emerald-400 font-semibold">{log.method} {log.endpoint}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-neutral-300 text-[11px] truncate">
                  {JSON.stringify(log.payload)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
