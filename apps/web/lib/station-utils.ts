/**
 * Utility functions for routing items to Kitchen vs Barista station.
 * Shared across the Barista Desk (/barista) and Customer Drinks menu (/drinks).
 */

export function isBeverageItem(name: string, categoryName?: string): boolean {
  const n = (name || "").toLowerCase().trim();
  const c = (categoryName || "").toLowerCase().trim();

  // If category is a beverage category
  if (
    c.includes("coffee") ||
    c.includes("brew") ||
    c.includes("chai") ||
    c.includes("tea") ||
    c.includes("drink") ||
    c.includes("beverage") ||
    c.includes("barista") ||
    c.includes("shake") ||
    c.includes("cooler") ||
    c.includes("smoothie") ||
    c.includes("kombucha")
  ) {
    return true;
  }

  // Check item keywords
  return (
    n.includes("coffee") ||
    n.includes("espresso") ||
    n.includes("americano") ||
    n.includes("latte") ||
    n.includes("cappuccino") ||
    n.includes("mocha") ||
    n.includes("cortado") ||
    n.includes("macchiato") ||
    n.includes("flat white") ||
    n.includes("brew") ||
    n.includes("pour over") ||
    n.includes("aeropress") ||
    n.includes("tonic") ||
    n.includes("shake") ||
    n.includes("frappe") ||
    n.includes("tea") ||
    n.includes("chai") ||
    n.includes("matcha") ||
    n.includes("smoothie") ||
    n.includes("kombucha") ||
    n.includes("beverage") ||
    n.includes("hot chocolate") ||
    n.includes("cooler") ||
    n.includes("lemonade") ||
    n.includes("soda") ||
    n.includes("cold brew")
  );
}
