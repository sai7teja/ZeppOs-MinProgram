import React from 'react';
import { Watch, Smartphone, Server, Database, BarChart3, ArrowRight } from 'lucide-react';

export const PipelineFlow: React.FC = () => {
  return (
    <div id="architecture-pipeline-card" className="bg-neutral-800/70 border border-neutral-700/80 rounded-2xl p-6 shadow-lg mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
          End-to-End Extraction Pipeline Architecture
        </h3>
        <span className="text-[11px] text-neutral-400 font-mono">Pipeline B: Zepp OS 3.0 Webhook Push</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
        {/* Step 1: Watch */}
        <div className="bg-neutral-900/90 border border-neutral-700/70 rounded-xl p-3.5 flex flex-col items-center text-center">
          <div className="w-9 h-9 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800/60 flex items-center justify-center mb-2">
            <Watch className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-neutral-200">1. Smartwatch</div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Zepp OS Mini-App</div>
          <div className="text-[10px] text-neutral-500 mt-1">@zos/sensor APIs (Pai, Sleep, HeartRate)</div>
        </div>

        {/* Step 2: Phone */}
        <div className="bg-neutral-900/90 border border-neutral-700/70 rounded-xl p-3.5 flex flex-col items-center text-center">
          <div className="w-9 h-9 rounded-full bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 flex items-center justify-center mb-2">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-neutral-200">2. Phone SideService</div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">@zeppos/zml</div>
          <div className="text-[10px] text-neutral-500 mt-1">Bluetooth bridge & HTTP fetch dispatcher</div>
        </div>

        {/* Step 3: Cloud Receiver */}
        <div className="bg-neutral-900/90 border border-neutral-700/70 rounded-xl p-3.5 flex flex-col items-center text-center">
          <div className="w-9 h-9 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center mb-2">
            <Server className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-neutral-200">3. Webhook Receiver</div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Port 3000 Ingress</div>
          <div className="text-[10px] text-neutral-500 mt-1">Express /health/metrics & /data ingest</div>
        </div>

        {/* Step 4: BigQuery */}
        <div className="bg-neutral-900/90 border border-neutral-700/70 rounded-xl p-3.5 flex flex-col items-center text-center">
          <div className="w-9 h-9 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/60 flex items-center justify-center mb-2">
            <Database className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-neutral-200">4. Google BigQuery</div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">zepp_health_data</div>
          <div className="text-[10px] text-neutral-500 mt-1">Real-time streaming insert tables</div>
        </div>

        {/* Step 5: Dashboard */}
        <div className="bg-neutral-900/90 border border-neutral-700/70 rounded-xl p-3.5 flex flex-col items-center text-center">
          <div className="w-9 h-9 rounded-full bg-purple-950/80 text-purple-400 border border-purple-800/60 flex items-center justify-center mb-2">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-neutral-200">5. Grafana Analytics</div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Continuous Monitoring</div>
          <div className="text-[10px] text-neutral-500 mt-1">Time-series health trend visualizer</div>
        </div>
      </div>
    </div>
  );
};
