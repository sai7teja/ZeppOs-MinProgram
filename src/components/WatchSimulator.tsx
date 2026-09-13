import React, { useState } from 'react';
import { Watch, Heart, Moon, Zap, Activity, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface WatchSimulatorProps {
  onSyncComplete: () => void;
}

export const WatchSimulator: React.FC<WatchSimulatorProps> = ({ onSyncComplete }) => {
  // Live watch sensor simulated state
  const [heartRate, setHeartRate] = useState<number>(76);
  const [sleepScore, setSleepScore] = useState<number>(85);
  const [totalPai, setTotalPai] = useState<number>(92);
  const [dailyPai, setDailyPai] = useState<number>(14);

  // Watch display state mirroring Zepp OS BasePage state & textWidget
  const [statusText, setStatusText] = useState<string>('Ready to extract');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<'success' | 'error' | null>(null);

  const handleSyncToOracle = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncResult(null);

    // 1. Mirroring zepp-mini-program/page/index.js step 1
    setStatusText('Reading sensors...');
    await new Promise((r) => setTimeout(r, 600));

    // 2. Reading sensor data payload
    const payload = {
      timestamp: new Date().toISOString(),
      pai_total: totalPai,
      daily_pai: dailyPai,
      sleep_score: sleepScore,
      heart_rate: heartRate,
      device: 'Amazfit GTR 4 (Zepp OS 3.0)'
    };

    // 3. Mirroring zepp-mini-program step: "Sending to Phone..."
    setStatusText('Sending to Phone (SideService)...');
    await new Promise((r) => setTimeout(r, 600));

    try {
      // 4. Side service POST to Oracle VM receiver (/data)
      const res = await fetch('/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusText('Success!\nData in BigQuery.');
        setSyncResult('success');
        onSyncComplete();
      } else {
        setStatusText('Failed to upload.');
        setSyncResult('error');
      }
    } catch (err) {
      setStatusText('Network Error!\nCheck Oracle Receiver');
      setSyncResult('error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div id="watch-simulator-card" className="bg-neutral-800/70 border border-neutral-700/80 rounded-2xl p-6 flex flex-col items-center shadow-lg">
      <div className="flex items-center justify-between w-full mb-4">
        <div className="flex items-center gap-2">
          <Watch className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-semibold text-neutral-100">Zepp OS Smartwatch</h2>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-800/60 font-mono">
          Zepp OS 3.0 • Mini-Program
        </span>
      </div>

      <p className="text-xs text-neutral-400 mb-6 text-center max-w-sm">
        Simulates the device application running <code className="text-neutral-300 bg-neutral-900 px-1 py-0.5 rounded">zepp-mini-program/page/index.js</code> with live sensor polling.
      </p>

      {/* Smartwatch circular hardware bezel */}
      <div className="relative w-64 h-64 rounded-full bg-neutral-950 border-4 border-neutral-700 shadow-2xl flex flex-col items-center justify-center p-4 relative overflow-hidden ring-2 ring-neutral-900">
        {/* Watch screen inner glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-950/10 via-transparent to-neutral-950 pointer-events-none" />

        {/* Watch Status Header */}
        <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Amazfit GTR</span>
          <span className="text-neutral-500">•</span>
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Sensor Glance metrics on watch screen */}
        <div className="grid grid-cols-3 gap-2 w-full px-4 mb-3 text-center">
          <div className="bg-neutral-900/90 rounded-lg p-1.5 border border-neutral-800">
            <Heart className="w-3.5 h-3.5 text-rose-400 mx-auto mb-0.5" />
            <div className="text-xs font-bold text-neutral-200">{heartRate}</div>
            <div className="text-[9px] text-neutral-500">BPM</div>
          </div>
          <div className="bg-neutral-900/90 rounded-lg p-1.5 border border-neutral-800">
            <Moon className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-0.5" />
            <div className="text-xs font-bold text-neutral-200">{sleepScore}</div>
            <div className="text-[9px] text-neutral-500">Score</div>
          </div>
          <div className="bg-neutral-900/90 rounded-lg p-1.5 border border-neutral-800">
            <Zap className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
            <div className="text-xs font-bold text-neutral-200">{totalPai}</div>
            <div className="text-[9px] text-neutral-500">PAI</div>
          </div>
        </div>

        {/* Text Widget display from page/index.js */}
        <div className="h-10 flex items-center justify-center text-center px-3 mb-2">
          <p className="text-[11px] font-medium text-neutral-300 whitespace-pre-line leading-tight">
            {statusText}
          </p>
        </div>

        {/* "Sync to Oracle" button styled exactly per page/index.js (0x1890ff normal_color) */}
        <button
          id="sync-to-oracle-btn"
          onClick={handleSyncToOracle}
          disabled={isSyncing}
          className="w-40 py-2 px-3 rounded-full bg-[#1890ff] hover:bg-[#096dd9] text-white text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5" />
              <span>Sync to Oracle</span>
            </>
          )}
        </button>
      </div>

      {/* Sensor Controls / Calibration Drawer */}
      <div className="w-full mt-6 pt-5 border-t border-neutral-700/60">
        <div className="text-xs font-medium text-neutral-400 mb-3 uppercase tracking-wider">
          Simulate Zepp Sensor Inputs
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">Heart Rate (BPM)</label>
            <input
              type="number"
              value={heartRate}
              onChange={(e) => setHeartRate(Number(e.target.value))}
              min={40}
              max={200}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">Sleep Score</label>
            <input
              type="number"
              value={sleepScore}
              onChange={(e) => setSleepScore(Number(e.target.value))}
              min={0}
              max={100}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">PAI Score</label>
            <input
              type="number"
              value={totalPai}
              onChange={(e) => setTotalPai(Number(e.target.value))}
              min={0}
              max={250}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
