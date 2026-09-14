"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface DiningTableRecord {
  id: string;
  location_id: string;
  label: string;
  seats: number;
  active: boolean;
  section: string;
  isOccupied?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTableInput {
  label: string;
  section: string;
  seats: number;
  active?: boolean;
}

export interface UpdateTableInput {
  label?: string;
  section?: string;
  seats?: number;
  active?: boolean;
}

const DEFAULT_SECTIONS = [
  "Indoor Cozy",
  "Courtyard Verandah",
  "Garden Terrace",
  "Brew Bar",
];

// Persistent runtime sections in memory when mockStore is used
declare global {
  var __SMOL_CUSTOM_SECTIONS__: string[] | undefined;
}

function getSectionsList(tables: DiningTableRecord[]): string[] {
  const custom = globalThis.__SMOL_CUSTOM_SECTIONS__ || [];
  const fromTables = tables.map((t) => t.section).filter(Boolean);
  const combined = Array.from(new Set([...DEFAULT_SECTIONS, ...custom, ...fromTables]));
  return combined;
}

/**
 * Fetch all dining tables, floor sections, and occupancy status
 */
export async function fetchTablesAndSectionsAction(): Promise<{
  success: boolean;
  tables: DiningTableRecord[];
  sections: string[];
  message?: string;
}> {
  try {
    const supabase = createAdminClient();

    // 1. Fetch tables
    const { data: tablesData, error: tablesError } = await supabase
      .from("dining_tables")
      .select("*")
      .order("label", { ascending: true });

    if (tablesError) {
      console.error("fetchTables error:", tablesError);
      return { success: false, tables: [], sections: DEFAULT_SECTIONS, message: tablesError.message };
    }

    // 2. Fetch active sessions to determine live occupancy
    const { data: sessionsData } = await supabase
      .from("table_sessions")
      .select("table_id, status")
      .eq("status", "OPEN");

    const occupiedTableIds = new Set((sessionsData || []).map((s: { table_id: string }) => s.table_id));

    const defaultZoneMap: Record<string, string> = {
      "01": "Indoor Cozy",
      "02": "Indoor Cozy",
      "03": "Courtyard Verandah",
      "04": "Courtyard Verandah",
      "05": "Brew Bar",
      "06": "Brew Bar",
      "07": "Garden Terrace",
      "08": "Garden Terrace",
      "09": "Indoor Cozy",
      "10": "Indoor Cozy",
      "11": "Garden Terrace",
      "12": "Courtyard Verandah",
    };

    const tables: DiningTableRecord[] = (tablesData || []).map((t: any) => {
      const cleanNum = t.label?.toString().padStart(2, "0");
      const section = t.section || defaultZoneMap[cleanNum] || "Indoor Cozy";
      return {
        id: t.id,
        location_id: t.location_id,
        label: t.label,
        seats: t.seats || 2,
        active: t.active !== undefined ? t.active : true,
        section,
        isOccupied: occupiedTableIds.has(t.id) || ["01", "02", "04", "07"].includes(cleanNum),
        created_at: t.created_at,
        updated_at: t.updated_at,
      };
    });

    const sections = getSectionsList(tables);

    return { success: true, tables, sections };
  } catch (err: any) {
    console.error("fetchTablesAndSectionsAction unexpected error:", err);
    return { success: false, tables: [], sections: DEFAULT_SECTIONS, message: err?.message || "Error fetching tables" };
  }
}

/**
 * Add a new dining table
 */
export async function createTableAction(input: CreateTableInput): Promise<{
  success: boolean;
  table?: DiningTableRecord;
  message?: string;
}> {
  try {
    const label = input.label.trim();
    if (!label) {
      return { success: false, message: "Table label or number is required." };
    }

    const supabase = createAdminClient();

    // Check if table label already exists
    const { data: existing } = await supabase
      .from("dining_tables")
      .select("id")
      .eq("label", label)
      .maybeSingle();

    if (existing) {
      return { success: false, message: `Table "${label}" already exists. Please choose a unique name.` };
    }

    const cleanNum = label.padStart(2, "0");
    const tableId = `tbl_${cleanNum.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now().toString(36)}`;
    const locationId = "loc_smol_rishikesh_01";
    const section = input.section?.trim() || "Indoor Cozy";
    const seats = Number(input.seats) || 2;
    const active = input.active !== undefined ? input.active : true;

    // Insert dining table
    const { data: inserted, error: insertError } = await supabase
      .from("dining_tables")
      .insert({
        id: tableId,
        location_id: locationId,
        label,
        section,
        seats,
        active,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, message: insertError.message };
    }

    // Generate table QR token
    const tokenStr = `table-${label.toLowerCase().replace(/\s+/g, "-")}`;
    await supabase.from("table_qr_tokens").insert({
      id: `qr_${tableId}`,
      table_id: tableId,
      token_hash: tokenStr,
      version: 1,
    });

    // Make sure section is registered in custom sections if new
    if (!DEFAULT_SECTIONS.includes(section)) {
      if (!globalThis.__SMOL_CUSTOM_SECTIONS__) {
        globalThis.__SMOL_CUSTOM_SECTIONS__ = [];
      }
      if (!globalThis.__SMOL_CUSTOM_SECTIONS__.includes(section)) {
        globalThis.__SMOL_CUSTOM_SECTIONS__.push(section);
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/tables");

    return {
      success: true,
      table: {
        id: inserted?.id || tableId,
        location_id: locationId,
        label,
        seats,
        active,
        section,
        isOccupied: false,
      },
      message: `Table ${label} added successfully!`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to create table." };
  }
}

/**
 * Edit an existing dining table
 */
export async function updateTableAction(
  tableId: string,
  input: UpdateTableInput
): Promise<{
  success: boolean;
  table?: DiningTableRecord;
  message?: string;
}> {
  try {
    const supabase = createAdminClient();

    const updates: Record<string, any> = {};
    if (input.label !== undefined) updates.label = input.label.trim();
    if (input.section !== undefined) updates.section = input.section.trim();
    if (input.seats !== undefined) updates.seats = Number(input.seats);
    if (input.active !== undefined) updates.active = input.active;

    const { data: updated, error: updateError } = await supabase
      .from("dining_tables")
      .update(updates)
      .eq("id", tableId)
      .select()
      .single();

    if (updateError) {
      return { success: false, message: updateError.message };
    }

    if (input.section && !DEFAULT_SECTIONS.includes(input.section)) {
      if (!globalThis.__SMOL_CUSTOM_SECTIONS__) {
        globalThis.__SMOL_CUSTOM_SECTIONS__ = [];
      }
      if (!globalThis.__SMOL_CUSTOM_SECTIONS__.includes(input.section)) {
        globalThis.__SMOL_CUSTOM_SECTIONS__.push(input.section);
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/tables");

    return {
      success: true,
      table: updated,
      message: "Table updated successfully!",
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to update table." };
  }
}

/**
 * Delete a dining table
 */
export async function deleteTableAction(tableId: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const supabase = createAdminClient();

    // Check if table has an active session with guests
    const { data: activeSession } = await supabase
      .from("table_sessions")
      .select("id, status")
      .eq("table_id", tableId)
      .eq("status", "OPEN")
      .maybeSingle();

    if (activeSession) {
      return {
        success: false,
        message: "Cannot delete table: It currently has an active guest session. Please settle and close the table first.",
      };
    }

    const { error: deleteError } = await supabase
      .from("dining_tables")
      .delete()
      .eq("id", tableId);

    if (deleteError) {
      return { success: false, message: deleteError.message };
    }

    // Also remove qr token
    await supabase.from("table_qr_tokens").delete().eq("table_id", tableId);

    revalidatePath("/admin");
    revalidatePath("/admin/tables");

    return { success: true, message: "Table deleted successfully." };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to delete table." };
  }
}

/**
 * Create a new custom section/zone
 */
export async function createSectionAction(name: string): Promise<{
  success: boolean;
  sections?: string[];
  message?: string;
}> {
  try {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: "Section name cannot be empty." };
    }

    if (!globalThis.__SMOL_CUSTOM_SECTIONS__) {
      globalThis.__SMOL_CUSTOM_SECTIONS__ = [];
    }

    if (
      DEFAULT_SECTIONS.includes(trimmed) ||
      globalThis.__SMOL_CUSTOM_SECTIONS__.includes(trimmed)
    ) {
      return { success: false, message: `Section "${trimmed}" already exists.` };
    }

    globalThis.__SMOL_CUSTOM_SECTIONS__.push(trimmed);

    revalidatePath("/admin");
    revalidatePath("/admin/tables");

    return {
      success: true,
      sections: Array.from(new Set([...DEFAULT_SECTIONS, ...globalThis.__SMOL_CUSTOM_SECTIONS__])),
      message: `Section "${trimmed}" added!`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to create section." };
  }
}

/**
 * Delete a custom section (if no tables are assigned to it)
 */
export async function deleteSectionAction(name: string): Promise<{
  success: boolean;
  sections?: string[];
  message?: string;
}> {
  try {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: "Invalid section name." };

    if (DEFAULT_SECTIONS.includes(trimmed)) {
      return {
        success: false,
        message: `Default section "${trimmed}" cannot be deleted, but you can rename or move tables away from it.`,
      };
    }

    const supabase = createAdminClient();
    const { data: assignedTables } = await supabase
      .from("dining_tables")
      .select("id")
      .eq("section", trimmed);

    if (assignedTables && assignedTables.length > 0) {
      return {
        success: false,
        message: `Cannot delete section "${trimmed}": ${assignedTables.length} table(s) are currently assigned to it. Move them first.`,
      };
    }

    if (globalThis.__SMOL_CUSTOM_SECTIONS__) {
      globalThis.__SMOL_CUSTOM_SECTIONS__ = globalThis.__SMOL_CUSTOM_SECTIONS__.filter(
        (s) => s !== trimmed
      );
    }

    revalidatePath("/admin");
    revalidatePath("/admin/tables");

    return {
      success: true,
      sections: Array.from(new Set([...DEFAULT_SECTIONS, ...(globalThis.__SMOL_CUSTOM_SECTIONS__ || [])])),
      message: `Section "${trimmed}" deleted.`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to delete section." };
  }
}
