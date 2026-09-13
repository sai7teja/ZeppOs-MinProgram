import React, { useState } from 'react';
import { Database, Table, Download, Trash2, Search, Heart, Moon, Zap } from 'lucide-react';
import { TableResponse } from '../types';

interface BigQueryViewerProps {
  data: TableResponse | null;
  onRefresh: () => void;
}

export const BigQueryViewer: React.FC<BigQueryViewerProps> = ({ data, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'sleep' | 'pai'>('metrics');
  const [filterText, setFilterText] = useState<string>('');
  const [isClearing, setIsClearing] = useState<boolean>(false);

  if (!data) {
    return (
      <div className="bg-neutral-800/70 border border-neutral-700/80 rounded-2xl p-6 text-center text-neutral-400">
        Loading BigQuery tables...
      </div>
    );
  }

  const { tables } = data;

  const handleClearTables = async () => {
    if (!window.confirm('Are you sure you want to clear stored BigQuery table rows?')) return;
    setIsClearing(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(tables, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zepp_health_bigquery_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="bigquery-warehouse-card" className="bg-neutral-800/70 border border-neutral-700/80 rounded-2xl p-6 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-neutral-100">
              Google BigQuery Warehouse <span className="text-neutral-400 text-sm font-mono font-normal">({data.dataset_id})</span>
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Streaming inserts authenticated through Google Service Account <code className="text-neutral-300">zepp-bq-writer</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-lg bg-neutral-700/80 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-neutral-300" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={handleClearTables}
            disabled={isClearing}
            className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Rows</span>
          </button>
        </div>
      </div>

      {/* Table Selection Tabs */}
      <div className="flex border-b border-neutral-700/80 mb-4 gap-2">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`pb-2.5 px-3 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'metrics'
              ? 'border-sky-500 text-sky-400 font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>metrics_history ({tables.metrics_history.rowCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('sleep')}
          className={`pb-2.5 px-3 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'sleep'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
          <span>sleep_history ({tables.sleep_history.rowCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('pai')}
          className={`pb-2.5 px-3 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'pai'
              ? 'border-amber-500 text-amber-400 font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>pai_history ({tables.pai_history.rowCount})</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-2 mb-3 bg-neutral-900/90 border border-neutral-700/70 rounded-xl px-3 py-1.5">
        <Search className="w-3.5 h-3.5 text-neutral-400" />
        <input
          type="text"
          placeholder="Filter records..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="bg-transparent text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none w-full"
        />
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto rounded-xl border border-neutral-700/60 bg-neutral-900/60">
        {activeTab === 'metrics' && (
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-800/80 text-neutral-400 font-mono text-[11px] border-b border-neutral-700/70">
              <tr>
                <th className="py-2.5 px-3">timestamp</th>
                <th className="py-2.5 px-3">metric_type</th>
                <th className="py-2.5 px-3">value</th>
                <th className="py-2.5 px-3">source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 font-mono">
              {tables.metrics_history.data
                .filter(
                  (r) =>
                    r.metric_type.toLowerCase().includes(filterText.toLowerCase()) ||
                    String(r.value).includes(filterText) ||
                    r.timestamp.includes(filterText)
                )
                .map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-800/40">
                    <td className="py-2 px-3 text-neutral-400 truncate max-w-xs">{row.timestamp}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.metric_type === 'heart_rate'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                            : 'bg-sky-950/80 text-sky-300 border border-sky-800/50'
                        }`}
                      >
                        {row.metric_type}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-neutral-100">{row.value}</td>
                    <td className="py-2 px-3 text-neutral-500 text-[11px]">{row.source || 'Zepp'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {activeTab === 'sleep' && (
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-800/80 text-neutral-400 font-mono text-[11px] border-b border-neutral-700/70">
              <tr>
                <th className="py-2.5 px-3">date</th>
                <th className="py-2.5 px-3">duration (min)</th>
                <th className="py-2.5 px-3">deep_sleep (min)</th>
                <th className="py-2.5 px-3">sleep_score</th>
                <th className="py-2.5 px-3">time range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 font-mono">
              {tables.sleep_history.data.map((row) => (
                <tr key={row.id} className="hover:bg-neutral-800/40">
                  <td className="py-2 px-3 text-neutral-200">{row.date}</td>
                  <td className="py-2 px-3">{row.total_sleep_mins}m</td>
                  <td className="py-2 px-3 text-indigo-300">{row.deep_sleep_mins}m</td>
                  <td className="py-2 px-3 font-bold text-emerald-400">{row.sleep_score}/100</td>
                  <td className="py-2 px-3 text-neutral-500 text-[11px]">
                    {row.start_time} - {row.end_time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'pai' && (
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-800/80 text-neutral-400 font-mono text-[11px] border-b border-neutral-700/70">
              <tr>
                <th className="py-2.5 px-3">date</th>
                <th className="py-2.5 px-3">total_pai</th>
                <th className="py-2.5 px-3">daily_pai</th>
                <th className="py-2.5 px-3">target status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 font-mono">
              {tables.pai_history.data.map((row) => (
                <tr key={row.id} className="hover:bg-neutral-800/40">
                  <td className="py-2 px-3 text-neutral-200">{row.date}</td>
                  <td className="py-2 px-3 font-bold text-amber-300">{row.total_pai}</td>
                  <td className="py-2 px-3 text-neutral-300">+{row.daily_pai}</td>
                  <td className="py-2 px-3">
                    {row.total_pai >= 100 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                        Target Met (100+)
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                        {100 - row.total_pai} PAI to goal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
