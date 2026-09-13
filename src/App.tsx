import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Heart, Moon, Zap, Layers, RefreshCw } from 'lucide-react';
import { WatchSimulator } from './components/WatchSimulator';
import { ReceiverStatus } from './components/ReceiverStatus';
import { BigQueryViewer } from './components/BigQueryViewer';
import { PipelineFlow } from './components/PipelineFlow';
import { TableResponse } from './types';

export default function App() {
  const [data, setData] = useState<TableResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/tables');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch table data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 6000);
    return () => clearInterval(interval);
  }, []);

  const totalRows = data
    ? data.tables.metrics_history.rowCount +
      data.tables.sleep_history.rowCount +
      data.tables.pai_history.rowCount
    : 0;

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col selection:bg-sky-500/30">
      {/* Top Navigation Bar */}
      <header className="border-b border-neutral-800/90 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Zepp OS Health Extractor
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                  Node.js Runtime
                </span>
              </h1>
              <p className="text-xs text-neutral-400">
                Continuous health telemetry streaming into Google BigQuery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-2 text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>BigQuery Dataset: <strong className="text-neutral-200 font-mono">zepp_health_data</strong></span>
            </div>
            <div className="bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 font-mono text-xs">
              <span className="text-neutral-500">Rows:</span> <strong className="text-emerald-400">{totalRows}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Architecture Pipeline Banner */}
        <PipelineFlow />

        {/* Dual Column: Watch Hardware Simulation + Receiver Webhook Ingress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <WatchSimulator onSyncComplete={fetchTables} />
          {data && (
            <ReceiverStatus
              receiverInfo={data.receiver_info}
              webhookLogs={data.webhook_logs}
              onRefresh={fetchTables}
            />
          )}
        </div>

        {/* Google BigQuery Live Warehouse Explorer */}
        <BigQueryViewer data={data} onRefresh={fetchTables} />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950/60 py-6 text-center text-xs text-neutral-500">
        <p>
          Imported from <span className="text-neutral-300 font-mono">sai7teja/ZeppOs-MinProgram</span> • Migrated for AI Studio Node.js Web Runtime
        </p>
      </footer>
    </div>
  );
}
