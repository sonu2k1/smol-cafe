"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  CreditCard,
  Armchair,
  ShoppingBag,
  Users,
  Settings,
  Shield,
  Tag,
  Search,
  QrCode,
  Coffee,
  RefreshCw,
  ExternalLink,
  Gift,
  TrendingUp,
} from "lucide-react";
import { TABLE_ZONES_CONFIG, createTableJsonTag, type TableJsonTag } from "@/lib/table-tag";
import { getUpiConfig, updateMerchantConfig, type MerchantConfig } from "@/lib/upi";
import { broadcastSyncEvent, subscribeToSyncEvents } from "@/lib/sync-events";
import { JsonTagInspectorModal } from "@/components/table/JsonTagInspectorModal";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface AdminTowerProps {
  initialMetrics?: {
    activeTablesCount?: number;
    activeOrdersCount?: number;
    lowStockCount?: number;
  };
}

export const AdminTowerDashboard: React.FC<AdminTowerProps> = () => {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "orders"
    | "tables"
    | "menu"
    | "customers"
    | "staff"
    | "payments"
    | "rewards"
    | "analytics"
    | "settings"
  >("overview");

  const [inspectingTag, setInspectingTag] = useState<TableJsonTag | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");

  // Merchant Settings State
  const [merchantConfig, setMerchantConfig] = useState<MerchantConfig>(getUpiConfig());
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Dynamic Menu Stock Management (simulated local persistence)
  const [soldOutItems, setSoldOutItems] = useState<Record<string, boolean>>({
    item_croissant_butter: true, // example 1 item sold out
  });

  // Mock Active Orders in Tower
  const [orders, setOrders] = useState([
    {
      id: "ORD-9421",
      orderNo: 104,
      tableLabel: "04",
      zone: "Courtyard Verandah",
      items: ["Artisanal Flat White (x2)", "Sourdough Mushroom Melt (x1)"],
      status: "PREPARING",
      totalRupees: 580,
      paymentStatus: "PAID (UPI)",
      createdAt: "10 mins ago",
    },
    {
      id: "ORD-9420",
      orderNo: 103,
      tableLabel: "02",
      zone: "Indoor Cozy",
      items: ["Single Origin Pour Over (x1)", "Almond Bun (x2)"],
      status: "READY",
      totalRupees: 420,
      paymentStatus: "PAID (CASH)",
      createdAt: "18 mins ago",
    },
    {
      id: "ORD-9419",
      orderNo: 102,
      tableLabel: "07",
      zone: "Garden Terrace",
      items: ["Iced Cascara Brew (x2)", "Truffle Fries (x1)", "Hummus Platter (x1)"],
      status: "SUBMITTED",
      totalRupees: 890,
      paymentStatus: "PAYMENT_PENDING",
      createdAt: "3 mins ago",
    },
    {
      id: "ORD-9418",
      orderNo: 101,
      tableLabel: "01",
      zone: "Indoor Cozy",
      items: ["Masala Chai (x2)", "Bun Maska (x2)"],
      status: "SERVED",
      totalRupees: 280,
      paymentStatus: "PAID (UPI)",
      createdAt: "42 mins ago",
    },
  ]);

  // Real-Time Sync Subscription
  useEffect(() => {
    const unsub = subscribeToSyncEvents((ev) => {
      if (ev.type === "ORDER_PLACED") {
        setOrders((prev) => [
          {
            id: ev.orderId || `ORD-${Date.now().toString().slice(-4)}`,
            orderNo: ev.orderNo || prev.length + 101,
            tableLabel: ev.tableLabel || "03",
            zone: TABLE_ZONES_CONFIG[ev.tableLabel || "03"]?.zone || "Indoor Cozy",
            items: ["Customer Table Order"],
            status: "SUBMITTED",
            totalRupees: 350,
            paymentStatus: "PAYMENT_PENDING",
            createdAt: "Just now",
          },
          ...prev,
        ]);
      } else if (ev.type === "STATUS_CHANGED" && ev.orderId) {
        setOrders((prev) =>
          prev.map((o) => (o.id === ev.orderId ? { ...o, status: ev.status || o.status } : o))
        );
      }
    });
    return unsub;
  }, []);

  const handleUpdateMerchantSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateMerchantConfig(merchantConfig);
    setMerchantConfig(updated);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);

    broadcastSyncEvent({
      type: "SETTINGS_UPDATED",
      timestamp: Date.now(),
    });
  };

  const toggleItemStock = (itemId: string) => {
    setSoldOutItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  return (
    <div className="min-h-screen bg-[#F3E7D3] dark:bg-[#141211] text-[#241F1C] dark:text-[#FDFBF7] flex transition-colors duration-200">
      {/* Sidebar Navigation */}
      <aside className="w-64 shrink-0 border-r border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] flex flex-col justify-between hidden md:flex transition-colors duration-200">
        <div className="p-5 space-y-6">
          {/* Logo & Cafe Branding */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#B72E35] text-white font-serif font-black text-xl shadow-md">
              s
            </div>
            <div>
              <h2 className="font-serif text-lg font-black tracking-tight text-[#241F1C] dark:text-white lowercase">
                smol tower
              </h2>
              <p className="font-mono text-[10px] text-[#725039] dark:text-[#C9AE8B]">Admin Control Hub</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 text-xs font-medium">
            {[
              { id: "overview", label: "Overview", icon: BarChart3, badge: "Live" },
              { id: "orders", label: "Orders", icon: ShoppingBag, badge: `${orders.length}` },
              { id: "tables", label: "Tables", icon: Armchair, badge: "12" },
              { id: "menu", label: "Menu Management", icon: Coffee, badge: "59" },
              { id: "customers", label: "Customers", icon: Users },
              { id: "staff", label: "Staff", icon: Shield },
              { id: "payments", label: "Payments", icon: CreditCard },
              { id: "rewards", label: "Rewards / Loyalty", icon: Gift, badge: "Club" },
              { id: "analytics", label: "Analytics", icon: TrendingUp },
              { id: "settings", label: "Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 transition cursor-pointer ${
                    isActive
                      ? "bg-[#B72E35] text-white font-bold shadow-md"
                      : "text-[#725039] hover:bg-[#F3E7D3] hover:text-[#241F1C] dark:text-stone-400 dark:hover:bg-stone-800/80 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-[#F3E7D3] dark:bg-stone-800 text-[#725039] dark:text-stone-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User & Back to Portals Footer */}
        <div className="border-t border-[#C9AE8B]/40 dark:border-stone-800 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[#725039] dark:text-stone-400">Owner Access</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <Link
            href="/menu"
            className="flex items-center justify-between rounded-xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#F3E7D3] dark:bg-stone-900 px-3 py-2 text-xs text-[#725039] dark:text-stone-300 hover:bg-[#EBDDC8] dark:hover:bg-stone-800 transition"
          >
            <span>Switch to Customer QR</span>
            <ExternalLink className="h-3 w-3 text-[#725039] dark:text-stone-500" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top App Header */}
        <header className="sticky top-0 z-30 border-b border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB]/95 dark:bg-[#1C1917]/95 px-6 py-4 backdrop-blur-md flex items-center justify-between transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="flex md:hidden items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-[#B72E35] text-white flex items-center justify-center font-bold text-xs">
                s
              </span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#241F1C] dark:text-white capitalize">
                {activeTab === "overview" && "Executive Operations Overview"}
                {activeTab === "orders" && "Real-Time Order Pipeline"}
                {activeTab === "tables" && "Table Floor Plan & JSON Tagging"}
                {activeTab === "menu" && "Catalog & Stock Availability"}
                {activeTab === "customers" && "Customer Directory & CRM"}
                {activeTab === "staff" && "Role-Based Access Control (RBAC)"}
                {activeTab === "payments" && "Financial Settlements & Reconciliation"}
                {activeTab === "rewards" && "Smol Club Rewards & Loyalty"}
                {activeTab === "analytics" && "Operational Analytics & Metrics"}
                {activeTab === "settings" && "Merchant ID & Hardware Setup"}
              </h1>
              <p className="font-mono text-[10px] text-[#725039] dark:text-[#C9AE8B]">
                Tapovan, Rishikesh • Real-Time Engine Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Refresh */}
            <button
              onClick={() => {
                broadcastSyncEvent({ type: "SETTINGS_UPDATED", timestamp: Date.now() });
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#F3E7D3] dark:bg-stone-900 px-3 py-1.5 text-xs text-[#725039] dark:text-stone-300 hover:bg-[#EBDDC8] dark:hover:bg-stone-800 transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sync All</span>
            </button>

            {/* Theme Toggle Button */}
            <ThemeToggle />
          </div>
        </header>

        {/* Tab 1: OVERVIEW DASHBOARD & CHARTS */}
        {activeTab === "overview" && (
          <div className="p-6 space-y-6 max-w-7xl">
            {/* 6 Hero KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {[
                { label: "TODAY'S ORDERS", value: "48", trend: "+14% vs yesterday", color: "#F2C84B" },
                { label: "GROSS REVENUE", value: "₹18,450", trend: "+22% peak brew", color: "#48BB78" },
                { label: "ACTIVE TABLES", value: "5 / 12", trend: "42% capacity", color: "#ED8936" },
                { label: "PENDING KDS", value: "3 Tickets", trend: "Avg wait: 9m", color: "#B72E35" },
                { label: "AVERAGE ORDER", value: "₹384", trend: "+8% add-ons", color: "#4299E1" },
                { label: "TOP SELLER", value: "Flat White", trend: "32 cups sold", color: "#9F7AEA" },
              ].map((kpi, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-4 shadow-sm space-y-1 transition-colors"
                >
                  <span className="block font-mono text-[9px] uppercase font-bold text-[#725039] dark:text-stone-400">
                    {kpi.label}
                  </span>
                  <div
                    className="font-serif text-2xl font-black tracking-tight"
                    style={{ color: kpi.color }}
                  >
                    {kpi.value}
                  </div>
                  <span className="block text-[10px] text-[#8C6D53] dark:text-stone-500 font-mono">{kpi.trend}</span>
                </div>
              ))}
            </div>

            {/* 5 Interactive Analytics Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Orders Over Time (Hourly Bar Chart) */}
              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 shadow-sm space-y-3 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-white">Orders Over Time</h3>
                    <p className="font-mono text-xs text-[#725039] dark:text-stone-400">Hourly ticket load (8AM - 10PM)</p>
                  </div>
                  <span className="rounded-full bg-[#F3E7D3] dark:bg-stone-800 border border-[#C9AE8B]/30 dark:border-stone-700 px-2.5 py-0.5 text-xs font-mono text-[#8C6207] dark:text-[#F2C84B]">
                    Peak: 4PM - 6PM
                  </span>
                </div>

                {/* SVG Bar Chart */}
                <div className="h-44 w-full flex items-end justify-between gap-1.5 pt-4 pb-2 border-b border-[#C9AE8B]/30 dark:border-stone-800">
                  {[
                    { hour: "8a", orders: 4 },
                    { hour: "9a", orders: 7 },
                    { hour: "10a", orders: 12 },
                    { hour: "11a", orders: 9 },
                    { hour: "12p", orders: 15 },
                    { hour: "1p", orders: 18 },
                    { hour: "2p", orders: 11 },
                    { hour: "3p", orders: 8 },
                    { hour: "4p", orders: 22 },
                    { hour: "5p", orders: 26 },
                    { hour: "6p", orders: 21 },
                    { hour: "7p", orders: 16 },
                    { hour: "8p", orders: 19 },
                    { hour: "9p", orders: 10 },
                  ].map((bar, i) => {
                    const heightPercent = Math.round((bar.orders / 28) * 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <span className="text-[9px] font-mono text-[#725039] dark:text-stone-400 opacity-0 group-hover:opacity-100 transition">
                          {bar.orders}
                        </span>
                        <div
                          className="w-full rounded-t-lg bg-[#B72E35] group-hover:bg-[#F2C84B] transition-all"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[9px] font-mono text-[#8C6D53] dark:text-stone-500">{bar.hour}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 2: Revenue Trend (Area Curve) */}
              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 shadow-sm space-y-3 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-white">Revenue Trajectory</h3>
                    <p className="font-mono text-xs text-[#725039] dark:text-stone-400">Cumulative day revenue vs 7-day average</p>
                  </div>
                  <span className="rounded-full bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 text-xs font-mono text-emerald-400">
                    +18% Today
                  </span>
                </div>

                <div className="relative h-44 w-full pt-2">
                  <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#48BB78" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#48BB78" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* 7-day average dotted line */}
                    <path
                      d="M0,100 Q100,75 200,55 T400,25"
                      fill="none"
                      stroke="#718096"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    {/* Today area */}
                    <path
                      d="M0,110 Q100,70 200,45 T400,10 L400,120 L0,120 Z"
                      fill="url(#revenueGrad)"
                    />
                    {/* Today stroke */}
                    <path
                      d="M0,110 Q100,70 200,45 T400,10"
                      fill="none"
                      stroke="#48BB78"
                      strokeWidth="3"
                    />
                  </svg>
                  <div className="flex justify-between font-mono text-[10px] text-stone-500 pt-1">
                    <span>Opening (8 AM)</span>
                    <span>Noon (1 PM)</span>
                    <span>Peak Evening (6 PM)</span>
                    <span>Close (10 PM)</span>
                  </div>
                </div>
              </div>

              {/* Chart 3: Best-Selling Items Breakdown */}
              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 shadow-sm space-y-4 transition-colors">
                <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-white">Best-Selling Items</h3>
                <div className="space-y-3">
                  {[
                    { name: "Artisanal Flat White", sales: 42, rev: "₹7,560", pct: 90 },
                    { name: "Sourdough Mushroom Melt", sales: 31, rev: "₹8,680", pct: 75 },
                    { name: "Masala Chai Pot", sales: 28, rev: "₹2,520", pct: 65 },
                    { name: "Iced Cascara Cold Brew", sales: 24, rev: "₹4,560", pct: 55 },
                    { name: "Classic Cinnamon Bun", sales: 19, rev: "₹2,660", pct: 45 },
                  ].map((item, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-[#241F1C] dark:text-stone-200">{item.name}</span>
                        <span className="font-mono text-[#725039] dark:text-stone-400">
                          {item.sales} sold • {item.rev}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#E8DCB8] dark:bg-stone-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#B72E35]"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart 4 & 5: Table Utilization & Payment Methods Split */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Table Utilization by Zone */}
                <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 shadow-sm space-y-3 transition-colors">
                  <h3 className="font-serif text-sm font-bold text-[#241F1C] dark:text-white">Zone Utilization</h3>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { zone: "Indoor Cozy", occ: "75%", color: "#F2C84B" },
                      { zone: "Courtyard Verandah", occ: "60%", color: "#B72E35" },
                      { zone: "Garden Terrace", occ: "40%", color: "#48BB78" },
                      { zone: "Brew Bar", occ: "100%", color: "#4299E1" },
                    ].map((z, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-[#5C4533] dark:text-stone-300">{z.zone}</span>
                        <span className="font-mono font-bold" style={{ color: z.color }}>
                          {z.occ}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Methods Split */}
                <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 shadow-sm space-y-3 transition-colors">
                  <h3 className="font-serif text-sm font-bold text-[#241F1C] dark:text-white">Payment Split</h3>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { mode: "UPI Direct QR", pct: "68%", color: "#48BB78" },
                      { mode: "Counter Cash", pct: "22%", color: "#ED8936" },
                      { mode: "Card / NFC", pct: "10%", color: "#4299E1" },
                    ].map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-[#5C4533] dark:text-stone-300">{p.mode}</span>
                        <span className="font-mono font-bold" style={{ color: p.color }}>
                          {p.pct}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: ORDERS MANAGEMENT */}
        {activeTab === "orders" && (
          <div className="p-6 space-y-4 max-w-7xl">
            {/* Filter & Search Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {["ALL", "SUBMITTED", "PREPARING", "READY", "SERVED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      orderStatusFilter === st
                        ? "bg-[#B72E35] text-white shadow-xs"
                        : "bg-[#FAF4EB] dark:bg-stone-900 border border-[#C9AE8B]/40 dark:border-stone-800 text-[#725039] dark:text-stone-400 hover:bg-[#F3E7D3] dark:hover:bg-stone-800"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C6D53] dark:text-stone-500" />
                <input
                  type="text"
                  placeholder="Search order # or table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-stone-900 pl-9 pr-4 py-2 text-xs text-[#241F1C] dark:text-white placeholder:text-[#8C6D53] dark:placeholder:text-stone-500 focus:border-[#B72E35] focus:outline-none"
                />
              </div>
            </div>

            {/* Orders Table */}
            <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] overflow-hidden shadow-xs transition-colors">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3E7D3] dark:bg-stone-900 text-[10px] uppercase tracking-wider font-mono text-[#725039] dark:text-stone-400 border-b border-[#C9AE8B]/30 dark:border-stone-800">
                  <tr>
                    <th className="p-3.5">Order No</th>
                    <th className="p-3.5">Table &amp; Zone</th>
                    <th className="p-3.5">Items Summary</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Total</th>
                    <th className="p-3.5">Payment</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9AE8B]/20 dark:divide-stone-800 font-mono">
                  {orders
                    .filter((o) => orderStatusFilter === "ALL" || o.status === orderStatusFilter)
                    .filter(
                      (o) =>
                        searchQuery === "" ||
                        o.orderNo.toString().includes(searchQuery) ||
                        o.tableLabel.includes(searchQuery)
                    )
                    .map((o) => (
                      <tr key={o.id} className="hover:bg-[#F3E7D3]/60 dark:hover:bg-stone-900/50 transition">
                        <td className="p-3.5 font-bold text-[#241F1C] dark:text-white">#{o.orderNo}</td>
                        <td className="p-3.5">
                          <span className="text-[#8C6207] dark:text-[#F2C84B] font-bold">Table {o.tableLabel}</span>
                          <span className="block text-[10px] text-[#8C6D53] dark:text-stone-500">{o.zone}</span>
                        </td>
                        <td className="p-3.5 max-w-xs truncate text-[#5C4533] dark:text-stone-300 font-sans">
                          {o.items.join(", ")}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              o.status === "READY"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                : o.status === "PREPARING"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                  : "bg-[#F3E7D3] text-[#725039] dark:bg-stone-800 dark:text-stone-300 border border-[#C9AE8B]/30 dark:border-stone-700"
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold font-serif text-[#241F1C] dark:text-white">₹{o.totalRupees}</td>
                        <td className="p-3.5 text-[11px] text-[#725039] dark:text-stone-400">{o.paymentStatus}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setInspectingTag(createTableJsonTag(o.tableLabel))}
                            className="inline-flex items-center gap-1 rounded-lg bg-stone-800 px-2.5 py-1 text-xs text-stone-300 hover:bg-stone-700 transition"
                          >
                            <Tag className="h-3 w-3 text-[#F2C84B]" />
                            <span>JSON Tag</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: TABLES FLOOR PLAN & JSON TAGGING */}
        {activeTab === "tables" && (
          <div className="p-6 space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#241F1C] dark:text-white">12 Dining Tables Floor Map</h2>
                <p className="font-mono text-xs text-[#725039] dark:text-stone-400">
                  Select any table to view QR code token or inspect JSON Tag
                </p>
              </div>
            </div>

            {/* 12 Tables Floor Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }, (_, i) => {
                const label = (i + 1).toString().padStart(2, "0");
                const config = TABLE_ZONES_CONFIG[label] || { zone: "Indoor Cozy", capacity: 2 };
                const isOccupied = ["01", "02", "04", "07", "05"].includes(label);

                return (
                  <div
                    key={label}
                    className={`rounded-3xl border p-4 text-left transition-all relative flex flex-col justify-between h-44 shadow-xs ${
                      isOccupied
                        ? "border-[#B72E35] bg-[#FAF4EB] dark:bg-[#1A1715] shadow-md ring-1 ring-[#B72E35]/40"
                        : "border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB]/60 dark:bg-[#171514] opacity-90 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xl font-black text-[#241F1C] dark:text-white">T-{label}</span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isOccupied ? "bg-emerald-500 animate-pulse" : "bg-[#C9AE8B] dark:bg-stone-600"
                          }`}
                        />
                      </div>
                      <span className="mt-1 block text-xs font-bold text-[#B72E35] dark:text-[#F2C84B]">
                        {config.zone}
                      </span>
                      <span className="text-[10px] text-[#725039] dark:text-stone-400 font-mono">
                        Seats: {config.capacity} guests
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <button
                        onClick={() => setInspectingTag(createTableJsonTag(label))}
                        className="w-full flex items-center justify-center gap-1 rounded-xl bg-[#F3E7D3] dark:bg-stone-800 py-1.5 text-[11px] font-mono text-[#241F1C] dark:text-stone-300 hover:bg-[#EBDDC8] dark:hover:bg-stone-700 transition"
                      >
                        <Tag className="h-3 w-3 text-[#B72E35] dark:text-[#F2C84B]" />
                        <span>JSON Tag</span>
                      </button>

                      <Link
                        href={`/t/table-${label}`}
                        className="w-full flex items-center justify-center gap-1 rounded-xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#FAF4EB] dark:bg-stone-900 py-1.5 text-[11px] font-mono text-[#725039] dark:text-stone-300 hover:bg-[#F3E7D3] dark:hover:bg-stone-800 transition"
                      >
                        <QrCode className="h-3 w-3" />
                        <span>Open QR</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: MENU MANAGEMENT & STOCK TOGGLE */}
        {activeTab === "menu" && (
          <div className="p-6 space-y-4 max-w-7xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#241F1C] dark:text-white">Menu Items Catalog (59 Items)</h2>
                <p className="font-mono text-xs text-[#725039] dark:text-stone-400">
                  Toggle instant In-Stock / Sold-Out availability for live customer menus
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] overflow-hidden shadow-xs transition-colors">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3E7D3] dark:bg-stone-900 text-[10px] uppercase tracking-wider font-mono text-[#725039] dark:text-stone-400 border-b border-[#C9AE8B]/30 dark:border-stone-800">
                  <tr>
                    <th className="p-3.5">Item Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Target Price</th>
                    <th className="p-3.5">Dietary</th>
                    <th className="p-3.5 text-right">Availability Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9AE8B]/20 dark:divide-stone-800">
                  {[
                    { id: "item_flat_white", name: "Artisanal Flat White", cat: "Specialty Coffee", price: "₹180", diet: "Vegetarian" },
                    { id: "item_pour_over", name: "Pour Over (Ratnagiri Estate)", cat: "Specialty Coffee", price: "₹220", diet: "Vegan" },
                    { id: "item_sourdough_melt", name: "Sourdough Mushroom Melt", cat: "Sandwiches", price: "₹280", diet: "Vegetarian" },
                    { id: "item_jaggery_latte", name: "Jaggery Latte", cat: "Specialty Coffee", price: "₹190", diet: "Vegetarian" },
                    { id: "item_croissant_butter", name: "Flaky Butter Croissant", cat: "Bakes & Treats", price: "₹140", diet: "Vegetarian" },
                    { id: "item_masala_chai", name: "Cutting Masala Chai", cat: "Chai & Infusions", price: "₹90", diet: "Vegetarian" },
                    { id: "item_smoothie_bowl", name: "Açaí Berry Power Bowl", cat: "Comfort Bowls", price: "₹310", diet: "Vegan" },
                  ].map((item) => {
                    const isSoldOut = soldOutItems[item.id] || false;
                    return (
                      <tr key={item.id} className="hover:bg-[#F3E7D3]/60 dark:hover:bg-stone-900/50 transition">
                        <td className="p-3.5 font-bold text-[#241F1C] dark:text-white">{item.name}</td>
                        <td className="p-3.5 font-mono text-[#725039] dark:text-stone-400">{item.cat}</td>
                        <td className="p-3.5 font-serif font-bold text-[#B72E35] dark:text-[#F2C84B]">{item.price}</td>
                        <td className="p-3.5 font-mono text-[#725039] dark:text-stone-400">{item.diet}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => toggleItemStock(item.id)}
                            className={`rounded-full px-3 py-1 font-mono text-xs font-bold transition ${
                              isSoldOut
                                ? "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                            }`}
                          >
                            {isSoldOut ? "SOLD OUT" : "IN STOCK"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: CUSTOMERS & LOYALTY */}
        {activeTab === "customers" && (
          <div className="p-6 space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#241F1C] dark:text-white">Smol Club Loyalty &amp; Rewards</h2>
                <p className="font-mono text-xs text-[#725039] dark:text-stone-400">
                  Guest ledger, reward points accrual &amp; tier tracking
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 space-y-2 shadow-xs">
                <span className="font-mono text-[10px] text-[#725039] dark:text-stone-400 uppercase">TIER 1: SEEDLING</span>
                <p className="font-serif text-2xl font-bold text-[#B72E35] dark:text-amber-300">0 - 100 Points</p>
                <p className="text-xs text-[#725039] dark:text-stone-400">Earn 1 pt per ₹10 spent. Free cookie at 100 pts.</p>
              </div>

              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 space-y-2 shadow-xs">
                <span className="font-mono text-[10px] text-[#725039] dark:text-stone-400 uppercase">TIER 2: REGULAR</span>
                <p className="font-serif text-2xl font-bold text-[#D97706] dark:text-[#F2C84B]">101 - 500 Points</p>
                <p className="text-xs text-[#725039] dark:text-stone-400">1.25x multiplier + 10% off artisanal coffees.</p>
              </div>

              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 space-y-2 shadow-xs">
                <span className="font-mono text-[10px] text-[#725039] dark:text-stone-400 uppercase">TIER 3: SMOL INSIDER</span>
                <p className="font-serif text-2xl font-bold text-emerald-700 dark:text-emerald-400">500+ Points</p>
                <p className="text-xs text-[#725039] dark:text-stone-400">Secret chalkboard brew tastings &amp; table reservations.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: STAFF & ACCESS ROLES (RBAC) */}
        {activeTab === "staff" && (
          <div className="p-6 space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#241F1C] dark:text-white">Staff Role-Based Access Control (RBAC)</h2>
                <p className="font-mono text-xs text-[#725039] dark:text-stone-400">
                  Authorized portals, default PIN keys &amp; active permissions
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] overflow-hidden shadow-xs transition-colors">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3E7D3] dark:bg-stone-900 text-[10px] uppercase tracking-wider font-mono text-[#725039] dark:text-stone-400 border-b border-[#C9AE8B]/30 dark:border-stone-800">
                  <tr>
                    <th className="p-3.5">Role Name</th>
                    <th className="p-3.5">Portal Access</th>
                    <th className="p-3.5">Quick PIN</th>
                    <th className="p-3.5">Permissions</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9AE8B]/20 dark:divide-stone-800 font-mono">
                  {[
                    { role: "Super Admin (Owner)", portal: "/admin", pin: "9900", perm: "Full Control, Budgets, Logs", status: "Active" },
                    { role: "Cashier / Counter Staff", portal: "/cashier", pin: "4422", perm: "Order Verification, Cash Settlement", status: "Active" },
                    { role: "Kitchen Display (Chef/Barista)", portal: "/kitchen", pin: "7711", perm: "Order Queue, Prep Status Transition", status: "Active" },
                    { role: "Customer (Guest)", portal: "/menu", pin: "None (QR)", perm: "Menu Browse, Order Submit, UPI Pay", status: "Public" },
                  ].map((s, idx) => (
                    <tr key={idx} className="hover:bg-[#F3E7D3]/60 dark:hover:bg-stone-900/50 transition">
                      <td className="p-3.5 font-bold text-[#241F1C] dark:text-white font-sans">{s.role}</td>
                      <td className="p-3.5 text-[#B72E35] dark:text-[#F2C84B]">{s.portal}</td>
                      <td className="p-3.5 font-black text-[#241F1C] dark:text-stone-300">{s.pin}</td>
                      <td className="p-3.5 text-[#725039] dark:text-stone-400 font-sans">{s.perm}</td>
                      <td className="p-3.5 text-right">
                        <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 7: SETTINGS & MERCHANT ID SETUP */}
        {activeTab === "settings" && (
          <div className="p-6 space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#241F1C] dark:text-white">UPI Gateway &amp; Merchant ID Setup</h2>
                <p className="font-mono text-xs text-[#725039] dark:text-stone-400">
                  Configure live VPA, business name &amp; tax parameters for all QR codes
                </p>
              </div>
            </div>

            {settingsSaved && (
              <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-950/60 p-4 text-xs font-serif text-emerald-900 dark:text-emerald-300 animate-scale-in">
                Merchant settings updated successfully! Dynamic QR codes updated in real time.
              </div>
            )}

            <form onSubmit={handleUpdateMerchantSettings} className="space-y-4">
              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-6 space-y-4 shadow-xs transition-colors">
                <div>
                  <label className="block text-xs font-bold text-[#241F1C] dark:text-stone-300 mb-1">
                    Merchant UPI VPA (Virtual Payment Address)
                  </label>
                  <input
                    type="text"
                    value={merchantConfig.vpa}
                    onChange={(e) =>
                      setMerchantConfig({ ...merchantConfig, vpa: e.target.value })
                    }
                    placeholder="e.g. smolcafe@icici or 9305084332@upi"
                    className="w-full rounded-xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-[#F3E7D3]/40 dark:bg-stone-900 px-4 py-3 font-mono text-sm text-[#241F1C] dark:text-white focus:border-[#B72E35] focus:outline-none"
                    required
                  />
                  <p className="mt-1 text-[11px] text-[#725039] dark:text-stone-500">
                    All UPI deep links (`upi://pay?pa=...`) and customer QR bills will route to this VPA.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#241F1C] dark:text-stone-300 mb-1">
                    Merchant Registered Business Name
                  </label>
                  <input
                    type="text"
                    value={merchantConfig.name}
                    onChange={(e) =>
                      setMerchantConfig({ ...merchantConfig, name: e.target.value })
                    }
                    placeholder="e.g. smol café Tapovan"
                    className="w-full rounded-xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-[#F3E7D3]/40 dark:bg-stone-900 px-4 py-3 text-sm text-[#241F1C] dark:text-white focus:border-[#B72E35] focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#241F1C] dark:text-stone-300 mb-1">
                      GSTIN Number
                    </label>
                    <input
                      type="text"
                      value={merchantConfig.gstin}
                      onChange={(e) =>
                        setMerchantConfig({ ...merchantConfig, gstin: e.target.value })
                      }
                      className="w-full rounded-xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-[#F3E7D3]/40 dark:bg-stone-900 px-4 py-3 font-mono text-xs text-[#241F1C] dark:text-white focus:border-[#B72E35] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#241F1C] dark:text-stone-300 mb-1">
                      Tax Percentage (CGST + SGST)
                    </label>
                    <input
                      type="number"
                      value={merchantConfig.taxRatePercent}
                      onChange={(e) =>
                        setMerchantConfig({
                          ...merchantConfig,
                          taxRatePercent: parseFloat(e.target.value) || 5,
                        })
                      }
                      className="w-full rounded-xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-[#F3E7D3]/40 dark:bg-stone-900 px-4 py-3 font-mono text-xs text-[#241F1C] dark:text-white focus:border-[#B72E35] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B72E35] py-3.5 font-serif text-sm font-bold text-white shadow-md hover:bg-[#9E242B] transition active:scale-98"
                  >
                    Save &amp; Broadcast Merchant Settings
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Tab 8: PAYMENTS LEDGER */}
        {activeTab === "payments" && (
          <div className="p-6 space-y-4 max-w-7xl">
            <h2 className="text-xl font-bold text-[#241F1C] dark:text-white">Payments Reconciliation &amp; Settlement Log</h2>
            <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] overflow-hidden shadow-xs transition-colors">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3E7D3] dark:bg-stone-900 text-[10px] uppercase tracking-wider font-mono text-[#725039] dark:text-stone-400 border-b border-[#C9AE8B]/30 dark:border-stone-800">
                  <tr>
                    <th className="p-3.5">Transaction ID</th>
                    <th className="p-3.5">Payment Method</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Order Ref</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9AE8B]/20 dark:divide-stone-800 font-mono">
                  {[
                    { txn: "UPI/2026/894129841", mode: "Google Pay", amt: "₹580", ord: "ORD-9421", st: "VERIFIED" },
                    { txn: "UPI/2026/718291048", mode: "PhonePe", amt: "₹420", ord: "ORD-9420", st: "VERIFIED" },
                    { txn: "CSH/2026/102941", mode: "Cash Tendered", amt: "₹280", ord: "ORD-9418", st: "SETTLED" },
                  ].map((t, idx) => (
                    <tr key={idx} className="hover:bg-[#F3E7D3]/60 dark:hover:bg-stone-900/50 transition">
                      <td className="p-3.5 font-bold text-[#241F1C] dark:text-stone-200">{t.txn}</td>
                      <td className="p-3.5 text-[#B72E35] dark:text-[#F2C84B] font-bold">{t.mode}</td>
                      <td className="p-3.5 font-serif font-bold text-[#241F1C] dark:text-white">{t.amt}</td>
                      <td className="p-3.5 text-[#725039] dark:text-stone-400">{t.ord}</td>
                      <td className="p-3.5">
                        <span className="rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                          {t.st}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 9: REWARDS & LOYALTY */}
        {activeTab === "rewards" && (
          <div className="p-6 space-y-6 max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold font-serif text-[#241F1C] dark:text-white lowercase">smol club · loyalty &amp; rewards</h2>
                <p className="font-serif italic text-xs text-[#725039] dark:text-[#C9AE8B]">
                  patron points, perk tiers, and reward vouchers
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[#B72E35]/40 bg-[#FAF4EB] dark:bg-[#B72E35]/15 px-3 py-1 text-xs font-mono text-[#B72E35] dark:text-[#F2C84B]">
                  Rule: ₹10 spent = 1 smol point
                </span>
              </div>
            </div>

            {/* Loyalty KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "ENROLLED MEMBERS", val: "1,248", sub: "+38 this week", color: "#B72E35" },
                { label: "POINTS ISSUED", val: "48,290", sub: "Valued at ₹4,829", color: "#319795" },
                { label: "PERKS REDEEMED", val: "312", sub: "26% redemption rate", color: "#D97706" },
                { label: "ACTIVE VOUCHERS", val: "6 Active", sub: "Coffee, buns, flights", color: "#8C6D53" },
              ].map((k, i) => (
                <div key={i} className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-4 space-y-1 shadow-xs transition-colors">
                  <span className="font-mono text-[9px] uppercase font-bold text-[#725039] dark:text-stone-400">{k.label}</span>
                  <div className="font-serif text-2xl font-bold" style={{ color: k.color }}>{k.val}</div>
                  <span className="font-mono text-[10px] text-[#725039]/80 dark:text-stone-500">{k.sub}</span>
                </div>
              ))}
            </div>

            {/* Active Reward Tiers & Vouchers Table */}
            <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] overflow-hidden shadow-xs transition-colors">
              <div className="border-b border-[#C9AE8B]/30 dark:border-stone-800 p-4 bg-[#F3E7D3] dark:bg-[#1F1B18] flex items-center justify-between">
                <h3 className="font-serif text-sm font-bold text-[#241F1C] dark:text-white">Active Redeemable Perks</h3>
                <span className="font-mono text-xs text-[#B72E35] dark:text-[#F2C84B]">Auto-synced to customer bill</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3E7D3]/60 dark:bg-stone-900 text-[10px] uppercase tracking-wider font-mono text-[#725039] dark:text-stone-400 border-b border-[#C9AE8B]/30 dark:border-stone-800">
                  <tr>
                    <th className="p-3.5">Perk Name</th>
                    <th className="p-3.5">Points Cost</th>
                    <th className="p-3.5">Benefit</th>
                    <th className="p-3.5">Redemptions</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9AE8B]/20 dark:divide-stone-800 font-mono">
                  {[
                    { name: "Complimentary Flat White", cost: "80 pts", benefit: "100% off any hot espresso brew", red: "142 times", st: "ACTIVE" },
                    { name: "15% Off Sourdough Melts", cost: "120 pts", benefit: "15% off food item", red: "89 times", st: "ACTIVE" },
                    { name: "Artisanal Cold Brew Bottle", cost: "150 pts", benefit: "Free 250ml take-home brew", red: "54 times", st: "ACTIVE" },
                    { name: "Chef's Almond Bun Treat", cost: "60 pts", benefit: "Complimentary fresh morning bake", red: "27 times", st: "ACTIVE" },
                  ].map((r, i) => (
                    <tr key={i} className="hover:bg-[#F3E7D3]/60 dark:hover:bg-stone-900/50 transition">
                      <td className="p-3.5 font-bold text-[#241F1C] dark:text-[#F3E7D3] font-sans">{r.name}</td>
                      <td className="p-3.5 text-[#B72E35] dark:text-[#F2C84B] font-bold">{r.cost}</td>
                      <td className="p-3.5 text-[#725039] dark:text-stone-300 font-sans">{r.benefit}</td>
                      <td className="p-3.5 text-[#725039]/80 dark:text-stone-400">{r.red}</td>
                      <td className="p-3.5">
                        <span className="rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                          {r.st}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 10: ANALYTICS SUITE */}
        {activeTab === "analytics" && (
          <div className="p-6 space-y-6 max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold font-serif text-[#241F1C] dark:text-white lowercase">smol analytics · operations &amp; trends</h2>
                <p className="font-serif italic text-xs text-[#725039] dark:text-[#C9AE8B]">
                  visual reports on revenue, orders, occupancy &amp; payment settlement
                </p>
              </div>
              <span className="rounded-full border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#FAF4EB] dark:bg-stone-800 px-3 py-1 text-xs font-mono text-[#725039] dark:text-stone-300">
                Data Range: Today · Real-Time
              </span>
            </div>

            {/* 4 Quick Analytics Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-4 space-y-1 shadow-xs transition-colors">
                <span className="font-mono text-[9px] uppercase font-bold text-[#725039] dark:text-stone-400">AVG TICKET VALUE</span>
                <div className="font-serif text-2xl font-bold text-[#B72E35] dark:text-[#F2C84B]">₹384.50</div>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">+8.4% vs last week</span>
              </div>
              <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-4 space-y-1 shadow-xs transition-colors">
                <span className="font-mono text-[9px] uppercase font-bold text-[#725039] dark:text-stone-400">TABLE TURN DURATION</span>
                <div className="font-serif text-2xl font-bold text-[#319795] dark:text-[#75AFA7]">38 mins</div>
                <span className="font-mono text-[10px] text-[#725039] dark:text-stone-400">Optimal cafe rhythm</span>
              </div>
              <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-4 space-y-1 shadow-xs transition-colors">
                <span className="font-mono text-[9px] uppercase font-bold text-[#725039] dark:text-stone-400">PEAK ORDER RATE</span>
                <div className="font-serif text-2xl font-bold text-[#B72E35]">26 tickets/hr</div>
                <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">4:00 PM – 6:00 PM</span>
              </div>
              <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-4 space-y-1 shadow-xs transition-colors">
                <span className="font-mono text-[9px] uppercase font-bold text-[#725039] dark:text-stone-400">RE-ORDER FREQUENCY</span>
                <div className="font-serif text-2xl font-bold text-[#D97706] dark:text-[#C9AE8B]">34.2%</div>
                <span className="font-mono text-[10px] text-[#725039] dark:text-stone-400">Dessert &amp; second coffee</span>
              </div>
            </div>

            {/* Analytics Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Orders Over Time */}
              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 shadow-xs space-y-3 transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-white">Orders Over Time</h3>
                  <span className="rounded-full bg-[#F3E7D3] dark:bg-stone-800 px-2.5 py-0.5 text-xs font-mono text-[#B72E35] dark:text-[#F2C84B]">
                    Peak: 5PM (26 Orders)
                  </span>
                </div>
                <div className="h-44 w-full flex items-end justify-between gap-1.5 pt-4 pb-2 border-b border-[#C9AE8B]/30 dark:border-stone-800">
                  {[
                    { hour: "8a", orders: 4 }, { hour: "9a", orders: 7 }, { hour: "10a", orders: 12 },
                    { hour: "11a", orders: 9 }, { hour: "12p", orders: 15 }, { hour: "1p", orders: 18 },
                    { hour: "2p", orders: 11 }, { hour: "3p", orders: 8 }, { hour: "4p", orders: 22 },
                    { hour: "5p", orders: 26 }, { hour: "6p", orders: 21 }, { hour: "7p", orders: 16 },
                    { hour: "8p", orders: 19 }, { hour: "9p", orders: 10 },
                  ].map((bar, i) => {
                    const heightPercent = Math.round((bar.orders / 28) * 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          className="w-full rounded-t-md bg-[#B72E35] group-hover:bg-[#D97706] dark:group-hover:bg-[#F2C84B] transition-all"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[9px] font-mono text-[#725039] dark:text-stone-500">{bar.hour}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 2: Revenue Trend */}
              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 shadow-xs space-y-3 transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-white">Revenue Trajectory</h3>
                  <span className="font-mono text-xs text-[#319795] dark:text-[#75AFA7]">Cumulative: ₹18,450</span>
                </div>
                <div className="h-44 w-full flex items-center justify-center p-2">
                  <svg className="h-full w-full overflow-visible" viewBox="0 0 300 100">
                    <polyline
                      fill="none"
                      stroke="#319795"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points="0,95 30,85 60,78 90,65 120,58 150,44 180,40 210,25 240,18 270,12 300,5"
                    />
                    <polygon
                      fill="#319795"
                      fillOpacity="0.15"
                      points="0,95 30,85 60,78 90,65 120,58 150,44 180,40 210,25 240,18 270,12 300,5 300,100 0,100"
                    />
                  </svg>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-[#725039] dark:text-stone-500 pt-1 border-t border-[#C9AE8B]/30 dark:border-stone-800">
                  <span>8:00 AM</span>
                  <span>2:00 PM</span>
                  <span>10:00 PM</span>
                </div>
              </div>

              {/* Chart 3: Best-Selling Items */}
              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 shadow-xs space-y-3 transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-white">Best-Selling Items</h3>
                  <span className="font-mono text-xs text-[#8C6D53] dark:text-[#C9AE8B]">Top 5 Menu Items</span>
                </div>
                <div className="space-y-2.5 pt-2">
                  {[
                    { name: "Artisanal Flat White", qty: 32, rev: "₹7,040", pct: 85, color: "#B72E35" },
                    { name: "Sourdough Mushroom Melt", qty: 24, rev: "₹7,680", pct: 68, color: "#D97706" },
                    { name: "Single Origin Pour Over", qty: 19, rev: "₹4,180", pct: 54, color: "#319795" },
                    { name: "Fresh Cinnamon Almond Bun", qty: 18, rev: "₹3,240", pct: 50, color: "#8C6D53" },
                    { name: "Masala Chai Pot", qty: 15, rev: "₹2,100", pct: 40, color: "#754CFF" },
                  ].map((item, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#241F1C] dark:text-stone-200">{item.name}</span>
                        <span className="font-mono text-[#725039] dark:text-stone-400">{item.qty} sold · {item.rev}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#EBDDC8] dark:bg-stone-800 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart 4: Table Utilization & Payment Methods */}
              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 shadow-xs space-y-4 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-white">Table Utilization</h3>
                    <span className="font-mono text-xs text-[#B72E35] dark:text-[#F2C84B]">5 / 12 Active (42%)</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2 pt-1">
                    {Array.from({ length: 12 }, (_, i) => {
                      const tableNum = (i + 1).toString().padStart(2, "0");
                      const isOccupied = [1, 2, 4, 7, 10].includes(i + 1);
                      return (
                        <div
                          key={tableNum}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center font-mono text-xs ${
                            isOccupied
                              ? "border-[#B72E35] bg-[#B72E35]/10 dark:bg-[#B72E35]/20 text-[#B72E35] dark:text-[#F2C84B] font-bold"
                              : "border-[#C9AE8B]/30 dark:border-stone-800 bg-[#F3E7D3] dark:bg-stone-900 text-[#725039] dark:text-stone-500"
                          }`}
                        >
                          <span className="font-bold">T{tableNum}</span>
                          <span className="text-[9px]">{isOccupied ? "Busy" : "Free"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-[#C9AE8B]/30 dark:border-stone-800 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-white">Payment Methods</h3>
                    <span className="font-mono text-xs text-[#319795] dark:text-[#75AFA7]">UPI Dominant</span>
                  </div>
                  <div className="flex h-3 w-full rounded-full overflow-hidden">
                    <div className="bg-[#B72E35]" style={{ width: "68%" }} title="UPI (68%)" />
                    <div className="bg-[#D97706] dark:bg-[#F2C84B]" style={{ width: "18%" }} title="QR Scan (18%)" />
                    <div className="bg-[#319795] dark:bg-[#75AFA7]" style={{ width: "10%" }} title="Card/GPay (10%)" />
                    <div className="bg-[#8C6D53] dark:bg-stone-600" style={{ width: "4%" }} title="Cash (4%)" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#725039] dark:text-stone-400 mt-2">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#B72E35]" /> UPI 68%</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#D97706] dark:bg-[#F2C84B]" /> QR 18%</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#319795] dark:bg-[#75AFA7]" /> Cards 10%</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#8C6D53] dark:bg-stone-600" /> Cash 4%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* JSON Table Tag Inspector Modal */}
      {inspectingTag && (
        <JsonTagInspectorModal
          tag={inspectingTag}
          onClose={() => setInspectingTag(null)}
        />
      )}
    </div>
  );
};
