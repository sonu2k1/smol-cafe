"use client";

import React, { useState } from "react";
import { TableJsonTag } from "@/lib/table-tag";
import { Copy, Check, X, Tag } from "lucide-react";

interface JsonTagInspectorModalProps {
  tag: TableJsonTag;
  onClose: () => void;
}

export const JsonTagInspectorModal: React.FC<JsonTagInspectorModalProps> = ({ tag, onClose }) => {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(tag, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-[#3D3530] bg-[#1C1917] p-6 shadow-2xl text-[#FDFBF7] transition-all animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2C84B] text-stone-900 font-bold">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white tracking-tight">
                JSON Tagging for Table {tag.table_number}
              </h3>
              <p className="font-mono text-[11px] text-[#C9AE8B]">
                Internal POS Metadata &amp; Sync Tag
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tag Summary Badges */}
        <div className="my-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-stone-800 px-2.5 py-1 font-mono text-emerald-400">
            Zone: {tag.zone}
          </span>
          <span className="rounded-lg bg-stone-800 px-2.5 py-1 font-mono text-amber-300">
            Capacity: {tag.capacity} guests
          </span>
          <span className="rounded-lg bg-stone-800 px-2.5 py-1 font-mono text-blue-300">
            Mode: {tag.service_mode}
          </span>
        </div>

        {/* JSON Code Viewer */}
        <div className="relative my-2 rounded-2xl border border-stone-800 bg-[#141211] p-4">
          <pre className="max-h-64 overflow-x-auto font-mono text-xs text-amber-100/90 leading-relaxed scrollbar-thin">
            {jsonString}
          </pre>

          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-800/80 px-2.5 py-1 text-xs text-stone-300 hover:bg-stone-700 hover:text-white transition"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        {/* Explanation Footer */}
        <p className="mt-3 text-xs text-stone-400 italic">
          This JSON tag travels with customer orders across Kitchen GDS, Cashier Desk, and Admin
          Tower for accurate table attribution and floor heatmaps.
        </p>
      </div>
    </div>
  );
};
