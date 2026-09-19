"use client";

import React, { useState, useEffect } from "react";
import { AdminLoginGate } from "./AdminLoginGate";
import { AdminTowerDashboard } from "./AdminTowerDashboard";
import type { AdminOverviewData } from "@/app/admin/actions";

interface AdminClientWrapperProps {
  initialMetrics?: {
    activeTablesCount?: number;
    activeOrdersCount?: number;
    lowStockCount?: number;
  };
  initialOverviewData?: AdminOverviewData;
}

export const AdminClientWrapper: React.FC<AdminClientWrapperProps> = ({ initialMetrics, initialOverviewData }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const isAuth = sessionStorage.getItem("smol_admin_auth") === "true";
      setIsAuthenticated(isAuth);
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  if (isAuthenticated === null) {
    // Loading skeleton with brand colors
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#241F1C] text-[#F3E7D3] font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#B72E35] border-t-transparent animate-spin" />
          <p className="font-serif italic text-xs text-[#C9AE8B]">loading admin tower...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginGate onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <AdminTowerDashboard
      initialMetrics={initialMetrics}
      initialOverviewData={initialOverviewData}
    />
  );
};
