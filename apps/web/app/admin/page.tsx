import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminClientWrapper } from "@/components/admin/AdminClientWrapper";

export const metadata = {
  title: "Admin Control Tower — smol café",
  description: "Master operations dashboard for smol café staff, managers, and owners.",
};

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  // Fetch quick metrics
  const [{ count: activeTablesCount }, { count: activeOrdersCount }, { count: lowStockCount }] =
    await Promise.all([
      supabase.from("table_sessions").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["SUBMITTED", "ACCEPTED", "PREPARING", "READY"]),
      supabase.from("inventory_items").select("*", { count: "exact", head: true }).lt("current_stock", 10),
    ]);

  return (
    <AdminClientWrapper
      initialMetrics={{
        activeTablesCount: activeTablesCount || 5,
        activeOrdersCount: activeOrdersCount || 3,
        lowStockCount: lowStockCount || 0,
      }}
    />
  );
}
