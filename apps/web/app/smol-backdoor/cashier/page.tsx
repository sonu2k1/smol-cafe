import { redirect } from "next/navigation";
import { requireStaffAuth } from "@/lib/auth/rbac";
import { fetchActiveCashierTablesAction } from "@/app/bill/actions";
import {
  fetchPendingCashierOrdersAction,
  fetchPaidCashierHistoryAction,
} from "@/app/cashier/actions";
import { CashierDashboard } from "@/components/cashier/CashierDashboard";

export const metadata = {
  title: "Cashier Desk & Settlement — smol café",
  description: "POS verification queue and table cash settlement for smol café staff.",
};

export default async function SmolBackdoorCashierPage() {
  const auth = await requireStaffAuth(["cashier", "admin"]);

  if (!auth.authorized) {
    redirect("/smol-backdoor");
  }

  const [tables, pendingOrdersRes, paidHistoryRes] = await Promise.all([
    fetchActiveCashierTablesAction(),
    fetchPendingCashierOrdersAction(),
    fetchPaidCashierHistoryAction(),
  ]);

  return (
    <CashierDashboard
      initialTables={tables}
      initialPendingOrders={pendingOrdersRes.success ? pendingOrdersRes.orders : []}
      initialPaidHistory={paidHistoryRes.success ? paidHistoryRes.records : []}
    />
  );
}
