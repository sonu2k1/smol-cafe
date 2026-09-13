"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { ObservabilityDashboardData } from "@/app/admin/observability/actions";
import { fetchObservabilityDataAction } from "@/app/admin/observability/actions";
import { Radio, RotateCw, AlertOctagon } from "lucide-react";
import Link from "next/link";

export const ObservabilityDashboard: React.FC = () => {
  const [data, setData] = useState<ObservabilityDashboardData | null>(null);
  const [filterLevel, setFilterLevel] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetchObservabilityDataAction();
      if (res.success) setData(res);
    } catch (err) {
      console.error("Failed to load observability data:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-xs text-stone-500 dark:bg-[#141211]">
        Loading observability telemetry...
      </div>
    );
  }

  const filteredLogs = data.recentLogs.filter((log) => {
    if (filterLevel !== "ALL" && log.level !== filterLevel) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.requestId.toLowerCase().includes(q) ||
        (log.action && log.action.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] p-6 text-[#2D241E] dark:bg-[#141211] dark:text-[#FDFBF7]">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-3">
              <Radio className="h-6 w-6 text-[#9B2C2C] dark:text-[#F6AD55]" />
              <h1 className="text-xl font-black uppercase tracking-tight text-stone-900 dark:text-stone-100">
                Smol Observability & System Health
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  data.sentryConfigured
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                }`}
              >
                Sentry {data.sentryConfigured ? "Connected" : "Local Fallback"}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-mono mt-1">
              Structured logs with request_id correlation & secret redaction
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            >
              ← Hub
            </Link>
            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="flex items-center gap-1 rounded-xl bg-[#9B2C2C] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#822424] dark:bg-[#C53030]"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Active Alert Banners */}
        {data.alerts.length > 0 && (
          <div className="space-y-2">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              <AlertOctagon className="h-3.5 w-3.5" /> Active System Alerts ({data.alerts.length})
            </span>
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-2xl border p-4 text-xs ${
                  alert.severity === "CRITICAL"
                    ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900/80 dark:bg-red-950/60 dark:text-red-200"
                    : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/80 dark:bg-amber-950/60 dark:text-amber-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{alert.title}</span>
                  <span className="font-mono text-[10px] opacity-75">{alert.triggeredAt}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">{alert.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Alert Rule Health Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Order Failure Rate Rule */}
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Rule 1: Order Failures
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  data.orderMetrics.isHealthy ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                }`}
              />
            </div>
            <p className="text-2xl font-black font-mono mt-2 text-stone-900 dark:text-stone-100">
              {data.orderMetrics.failureRatePercent}%
            </p>
            <p className="text-[11px] text-stone-500 mt-1">
              {data.orderMetrics.recent5MinFailures} failures / {data.orderMetrics.recent5MinTotal}{" "}
              attempts (5m window)
            </p>
            <span className="text-[9px] font-mono text-stone-400 mt-2 block">
              Threshold: &gt;5% in 5 min
            </span>
          </div>

          {/* KDS Heartbeat Silence Rule */}
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Rule 2: KDS Heartbeat
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  data.kdsHealth.isHealthy ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
            </div>
            <p className="text-2xl font-black font-mono mt-2 text-stone-900 dark:text-stone-100">
              {data.kdsHealth.silenceSeconds}s ago
            </p>
            <p className="text-[11px] text-stone-500 mt-1">
              Last check-in: {new Date(data.kdsHealth.lastHeartbeatAt).toLocaleTimeString()}
            </p>
            <span className="text-[9px] font-mono text-stone-400 mt-2 block">
              Threshold: &gt;180s silence during orders
            </span>
          </div>

          {/* Razorpay Webhook Rule */}
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Rule 3: Webhook Health
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  data.webhookHealth.isHealthy ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                }`}
              />
            </div>
            <p className="text-2xl font-black font-mono mt-2 text-stone-900 dark:text-stone-100">
              {data.webhookHealth.consecutiveFailures} errors
            </p>
            <p className="text-[11px] text-stone-500 mt-1">Consecutive payment webhook failures</p>
            <span className="text-[9px] font-mono text-stone-400 mt-2 block">
              Threshold: &ge;3 consecutive errors
            </span>
          </div>
        </div>

        {/* Structured Log Stream */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                Live Structured JSON Log Stream
              </h2>
              <p className="text-xs text-stone-500 font-mono">
                Showing {filteredLogs.length} events • All secrets, passwords & OTPs redacted
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requestId or message..."
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
              />

              <div className="flex rounded-xl border border-stone-200 bg-stone-50 p-0.5 dark:border-stone-700 dark:bg-stone-800 text-[11px] font-bold">
                {(["ALL", "INFO", "WARN", "ERROR"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setFilterLevel(level)}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      filterLevel === level
                        ? "bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-100"
                        : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Logs Table / Terminal */}
          <div className="rounded-2xl border border-stone-800 bg-[#0F0E0D] p-4 font-mono text-xs text-stone-300 max-h-96 overflow-y-auto space-y-2.5">
            {filteredLogs.length === 0 ? (
              <p className="text-center text-stone-600 py-6">No matching structured log events</p>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-stone-800/80 bg-stone-900/40 p-2.5 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                          log.level === "ERROR"
                            ? "bg-red-950 text-red-400 border border-red-800"
                            : log.level === "WARN"
                              ? "bg-amber-950 text-amber-400 border border-amber-800"
                              : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="font-bold text-amber-400">{log.requestId}</span>
                      {log.action && <span className="text-stone-400">[{log.action}]</span>}
                    </div>
                    <span className="text-stone-500 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-stone-200">{log.message}</p>

                  {log.data && Object.keys(log.data).length > 0 && (
                    <pre className="text-[10px] text-stone-400 bg-black/40 p-1.5 rounded-lg overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
