"use client";

import React, { useState, useEffect } from "react";
import type { EtaAccuracyReport } from "@/app/admin/kitchen/eta-actions";
import { fetchEtaAccuracyReportAction } from "@/app/admin/kitchen/eta-actions";
import { RotateCw, Target, Zap, Clock } from "lucide-react";

export const EtaAccuracyReview: React.FC = () => {
  const [report, setReport] = useState<EtaAccuracyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReport = async () => {
    try {
      const res = await fetchEtaAccuracyReportAction();
      if (res.success) setReport(res);
    } catch (err) {
      console.error("Error loading ETA accuracy report:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center text-xs text-stone-500 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        Loading ETA metrics & station backlogs...
      </div>
    );
  }

  if (!report || !report.success) return null;

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⏱️</span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              Kitchen Station Load & ETA Accuracy
            </h3>
          </div>
          <p className="text-xs text-stone-500 font-mono mt-0.5">
            Deterministic station bottleneck analysis • {report.totalAnalyzed} served orders audited
          </p>
        </div>

        <button
          onClick={loadReport}
          className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Live Station Load Backlogs */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Live Station Workloads
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {report.stations.map((s) => (
            <div
              key={s.stationId}
              className="rounded-2xl border border-stone-100 bg-stone-50/80 p-3 dark:border-stone-800 dark:bg-stone-800/40"
            >
              <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                {s.stationName}
              </h4>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-mono font-black text-[#9B2C2C] dark:text-[#F6AD55]">
                  {s.activeItemCount} active
                </span>
                <span className="text-[10px] font-mono text-stone-400">
                  ~{s.estimatedBacklogMinutes}m wait
                </span>
              </div>
              <p className="text-[9px] text-stone-400 mt-1 font-mono">Cap: {s.capacity} items</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accuracy Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-stone-100 pt-4 dark:border-stone-800">
        <div className="rounded-2xl bg-stone-50/70 p-3 dark:bg-stone-800/40">
          <span className="text-[10px] font-bold uppercase text-stone-400">Within Range</span>
          <p className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
            {report.withinRangePercentage}%
          </p>
          <span className="text-[10px] text-stone-400">On-target predictions</span>
        </div>

        <div className="rounded-2xl bg-stone-50/70 p-3 dark:bg-stone-800/40">
          <span className="text-[10px] font-bold uppercase text-stone-400">Avg Error Margin</span>
          <p className="text-lg font-black font-mono text-stone-900 dark:text-stone-100 mt-0.5">
            ±{report.avgErrorMinutes} min
          </p>
          <span className="text-[10px] text-stone-400">Deviation from reality</span>
        </div>

        <div className="rounded-2xl bg-stone-50/70 p-3 dark:bg-stone-800/40">
          <span className="text-[10px] font-bold uppercase text-stone-400">Avg Predicted</span>
          <p className="text-lg font-black font-mono text-stone-900 dark:text-stone-100 mt-0.5">
            {report.avgPredictedMinutes} min
          </p>
          <span className="text-[10px] text-stone-400">Initial forecast</span>
        </div>

        <div className="rounded-2xl bg-stone-50/70 p-3 dark:bg-stone-800/40">
          <span className="text-[10px] font-bold uppercase text-stone-400">Avg Actual Prep</span>
          <p className="text-lg font-black font-mono text-stone-900 dark:text-stone-100 mt-0.5">
            {report.avgActualMinutes} min
          </p>
          <span className="text-[10px] text-stone-400">Order to served time</span>
        </div>
      </div>

      {/* Accuracy Audit Log */}
      {report.records.length > 0 && (
        <div className="space-y-2 border-t border-stone-100 pt-4 dark:border-stone-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Recent Order Prediction Log
          </span>

          <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-56 overflow-y-auto">
            {report.records.map((rec) => {
              const actualMins = Math.round((rec.actualSeconds / 60) * 10) / 10;
              const errorMins = Math.round((rec.errorSeconds / 60) * 10) / 10;

              return (
                <div
                  key={rec.id}
                  className="py-2 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      Order #{rec.orderNo}
                    </span>
                    <span className="text-stone-300 dark:text-stone-700">•</span>
                    <span className="text-stone-500">
                      Predicted: {rec.predictedMin}–{rec.predictedMax}m
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-stone-700 dark:text-stone-300">
                      Served in {actualMins}m ({errorMins >= 0 ? "+" : ""}
                      {errorMins}m)
                    </span>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                        rec.accuracyCategory === "ON_TIME"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : rec.accuracyCategory === "FASTER"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {rec.accuracyCategory === "ON_TIME"
                        ? "On Target"
                        : rec.accuracyCategory === "FASTER"
                          ? "Faster"
                          : "Slower"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
