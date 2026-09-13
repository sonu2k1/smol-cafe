import { logger } from "./logger";

export interface SystemAlert {
  id: string;
  rule: "ORDER_FAILURE_SPIKE" | "KDS_HEARTBEAT_SILENCE" | "WEBHOOK_FAILURE_THRESHOLD";
  severity: "CRITICAL" | "WARNING";
  title: string;
  message: string;
  triggeredAt: string;
  metadata?: Record<string, unknown>;
}

// In-memory sliding window state for metrics
const orderSubmissionsWindow: { timestamp: number; success: boolean }[] = [];
let lastKdsHeartbeatTimestamp: number = Date.now();
let consecutiveWebhookFailures: number = 0;
const activeAlerts: SystemAlert[] = [];

/**
 * Records an order submission attempt for rolling 5-minute error rate calculation
 */
export function recordOrderAttempt(success: boolean, orderId?: string): void {
  const now = Date.now();
  orderSubmissionsWindow.push({ timestamp: now, success });

  // Prune entries older than 5 minutes (300,000 ms)
  const fiveMinAgo = now - 300000;
  while (orderSubmissionsWindow.length > 0 && orderSubmissionsWindow[0].timestamp < fiveMinAgo) {
    orderSubmissionsWindow.shift();
  }

  // Evaluate Rule 1: Order failure rate > 5% in 5 min (minimum 5 total attempts)
  const total = orderSubmissionsWindow.length;
  if (total >= 5) {
    const failures = orderSubmissionsWindow.filter((o) => !o.success).length;
    const failureRate = Math.round((failures / total) * 100);

    if (failureRate > 5) {
      triggerAlert({
        id: `alert_order_fail_${Math.floor(now / 60000)}`,
        rule: "ORDER_FAILURE_SPIKE",
        severity: "CRITICAL",
        title: `High Order Failure Rate: ${failureRate}%`,
        message: `${failures} out of ${total} order attempts failed in the last 5 minutes.`,
        triggeredAt: new Date().toISOString(),
        metadata: {
          failureRate,
          totalAttempts: total,
          failedAttempts: failures,
          lastOrderId: orderId,
        },
      });
    }
  }
}

/**
 * Records a KDS heartbeat ping from the kitchen display
 */
export function recordKdsHeartbeat(): void {
  lastKdsHeartbeatTimestamp = Date.now();
}

/**
 * Checks if KDS screen has gone silent (> 3 min) while active orders are waiting
 */
export function evaluateKdsSilence(activeOrderCount: number): void {
  const now = Date.now();
  const silenceSeconds = Math.round((now - lastKdsHeartbeatTimestamp) / 1000);

  // If active tickets exist and KDS has not polled in 180s (3 min)
  if (activeOrderCount > 0 && silenceSeconds > 180) {
    triggerAlert({
      id: `alert_kds_silence_${Math.floor(now / 60000)}`,
      rule: "KDS_HEARTBEAT_SILENCE",
      severity: "WARNING",
      title: `KDS Heartbeat Silence: ${Math.round(silenceSeconds / 60)}m`,
      message: `Kitchen display has not polled in ${silenceSeconds}s while ${activeOrderCount} active orders are pending.`,
      triggeredAt: new Date().toISOString(),
      metadata: { silenceSeconds, activeOrderCount },
    });
  }
}

/**
 * Records a webhook processing failure
 */
export function recordWebhookFailure(error: string, eventId?: string): void {
  consecutiveWebhookFailures += 1;

  if (consecutiveWebhookFailures >= 3) {
    triggerAlert({
      id: `alert_webhook_fail_${Date.now()}`,
      rule: "WEBHOOK_FAILURE_THRESHOLD",
      severity: "CRITICAL",
      title: `Payment Webhook Failures: ${consecutiveWebhookFailures} consecutive errors`,
      message: `Razorpay payment webhook handler encountered ${consecutiveWebhookFailures} consecutive errors. Last error: ${error}`,
      triggeredAt: new Date().toISOString(),
      metadata: { consecutiveFailures: consecutiveWebhookFailures, lastEventId: eventId },
    });
  }
}

/**
 * Resets webhook failure count upon successful processing
 */
export function recordWebhookSuccess(): void {
  consecutiveWebhookFailures = 0;
}

/**
 * Triggers and dispatches an alert
 */
export async function triggerAlert(alert: SystemAlert): Promise<void> {
  // Deduplicate recent identical alerts
  const existing = activeAlerts.find(
    (a) =>
      a.id === alert.id ||
      (a.rule === alert.rule && Date.now() - new Date(a.triggeredAt).getTime() < 120000)
  );
  if (existing) return;

  activeAlerts.unshift(alert);
  if (activeAlerts.length > 20) activeAlerts.pop();

  logger.error(`[SYSTEM ALERT TRIGGERED] ${alert.title} - ${alert.message}`, {
    data: { alert },
  });

  // Dispatch to external webhook (e.g. Slack / Discord / OpsGenie) if configured
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*[Smol Café Alert: ${alert.severity}]* ${alert.title}\n>${alert.message}\n_Time: ${alert.triggeredAt}_`,
          alert,
        }),
      });
    } catch (err) {
      console.error("Failed to dispatch alert webhook:", err);
    }
  }
}

/**
 * Returns current active alerts and observability telemetry
 */
export function getObservabilitySummary() {
  const now = Date.now();
  const fiveMinAgo = now - 300000;
  const recentOrders = orderSubmissionsWindow.filter((o) => o.timestamp >= fiveMinAgo);
  const total = recentOrders.length;
  const failures = recentOrders.filter((o) => !o.success).length;
  const failureRate = total > 0 ? Math.round((failures / total) * 100) : 0;
  const kdsSilenceSeconds = Math.round((now - lastKdsHeartbeatTimestamp) / 1000);

  return {
    orderMetrics: {
      recent5MinTotal: total,
      recent5MinFailures: failures,
      failureRatePercent: failureRate,
      isHealthy: failureRate <= 5,
    },
    kdsHealth: {
      lastHeartbeatAt: new Date(lastKdsHeartbeatTimestamp).toISOString(),
      silenceSeconds: kdsSilenceSeconds,
      isHealthy: kdsSilenceSeconds <= 180,
    },
    webhookHealth: {
      consecutiveFailures: consecutiveWebhookFailures,
      isHealthy: consecutiveWebhookFailures < 3,
    },
    alerts: [...activeAlerts],
  };
}
