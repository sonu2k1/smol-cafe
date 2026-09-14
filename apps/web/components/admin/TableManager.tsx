"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Armchair,
  Plus,
  Edit2,
  Trash2,
  QrCode,
  Tag,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Users,
  ExternalLink,
  Printer,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  type DiningTableRecord,
  createTableAction,
  updateTableAction,
  deleteTableAction,
  createSectionAction,
  deleteSectionAction,
  fetchTablesAndSectionsAction,
} from "@/app/admin/tables/actions";
import { JsonTagInspectorModal } from "@/components/table/JsonTagInspectorModal";
import { createTableJsonTag, type TableJsonTag } from "@/lib/table-tag";

interface TableManagerProps {
  initialTables?: DiningTableRecord[];
  initialSections?: string[];
}

export const TableManager: React.FC<TableManagerProps> = ({
  initialTables = [],
  initialSections = [],
}) => {
  const [tables, setTables] = useState<DiningTableRecord[]>(initialTables);
  const [sections, setSections] = useState<string[]>(
    initialSections.length > 0
      ? initialSections
      : ["Indoor Cozy", "Courtyard Verandah", "Garden Terrace", "Brew Bar"]
  );
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  React.useEffect(() => {
    if (initialTables.length === 0) {
      fetchTablesAndSectionsAction().then((res) => {
        if (res.success && res.tables) {
          setTables(res.tables);
          if (res.sections && res.sections.length > 0) {
            setSections(res.sections);
          }
        }
      });
    }
  }, [initialTables]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingTable, setEditingTable] = useState<DiningTableRecord | null>(null);
  const [deletingTable, setDeletingTable] = useState<DiningTableRecord | null>(null);
  const [isSectionsModalOpen, setIsSectionsModalOpen] = useState<boolean>(false);
  const [inspectingTag, setInspectingTag] = useState<TableJsonTag | null>(null);
  const [viewingQrTable, setViewingQrTable] = useState<DiningTableRecord | null>(null);

  // Form states
  const [tableLabel, setTableLabel] = useState<string>("");
  const [tableSection, setTableSection] = useState<string>(sections[0] || "Indoor Cozy");
  const [tableSeats, setTableSeats] = useState<number>(4);
  const [tableActive, setTableActive] = useState<boolean>(true);
  const [newSectionName, setNewSectionName] = useState<string>("");

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Statistics
  const stats = useMemo(() => {
    const total = tables.length;
    const active = tables.filter((t) => t.active).length;
    const occupied = tables.filter((t) => t.isOccupied).length;
    const totalSeats = tables.reduce((sum, t) => sum + (t.seats || 0), 0);
    return { total, active, occupied, totalSeats };
  }, [tables]);

  // Section table counts
  const sectionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    tables.forEach((t) => {
      map[t.section] = (map[t.section] || 0) + 1;
    });
    return map;
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchSection = selectedSection === "ALL" || t.section === selectedSection;
      const matchSearch =
        !searchQuery.trim() ||
        t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.section.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSection && matchSearch;
    });
  }, [tables, selectedSection, searchQuery]);

  // Section color accents
  const getSectionBadgeClass = (sec: string) => {
    switch (sec) {
      case "Indoor Cozy":
        return "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800";
      case "Courtyard Verandah":
        return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800";
      case "Garden Terrace":
        return "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800";
      case "Brew Bar":
        return "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800";
      default:
        return "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800";
    }
  };

  // Open Add Table Modal
  const handleOpenAdd = () => {
    const nextNum = (tables.length + 1).toString().padStart(2, "0");
    setTableLabel(nextNum);
    setTableSection(sections[0] || "Indoor Cozy");
    setTableSeats(4);
    setTableActive(true);
    setFeedback(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Table Modal
  const handleOpenEdit = (t: DiningTableRecord) => {
    setEditingTable(t);
    setTableLabel(t.label);
    setTableSection(t.section || sections[0] || "Indoor Cozy");
    setTableSeats(t.seats || 2);
    setTableActive(t.active);
    setFeedback(null);
  };

  // Submit Add Table
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableLabel.trim()) {
      setFeedback({ type: "error", text: "Please enter a table label or number." });
      return;
    }
    setIsLoading(true);
    try {
      const res = await createTableAction({
        label: tableLabel.trim(),
        section: tableSection,
        seats: tableSeats,
        active: tableActive,
      });

      if (res.success && res.table) {
        setTables((prev) => [...prev, res.table!]);
        if (!sections.includes(tableSection)) {
          setSections((prev) => [...prev, tableSection]);
        }
        setIsAddModalOpen(false);
        setFeedback({ type: "success", text: res.message || "Table added successfully!" });
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to add table." });
      }
    } catch {
      setFeedback({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Edit Table
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    if (!tableLabel.trim()) {
      setFeedback({ type: "error", text: "Table label cannot be empty." });
      return;
    }
    setIsLoading(true);
    try {
      const res = await updateTableAction(editingTable.id, {
        label: tableLabel.trim(),
        section: tableSection,
        seats: tableSeats,
        active: tableActive,
      });

      if (res.success && res.table) {
        setTables((prev) =>
          prev.map((t) => (t.id === editingTable.id ? { ...t, ...res.table } : t))
        );
        if (!sections.includes(tableSection)) {
          setSections((prev) => [...prev, tableSection]);
        }
        setEditingTable(null);
        setFeedback({ type: "success", text: "Table updated successfully!" });
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to update table." });
      }
    } catch {
      setFeedback({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Table Active inline
  const handleToggleActive = async (t: DiningTableRecord) => {
    const newStatus = !t.active;
    try {
      const res = await updateTableAction(t.id, { active: newStatus });
      if (res.success) {
        setTables((prev) =>
          prev.map((item) => (item.id === t.id ? { ...item, active: newStatus } : item))
        );
      }
    } catch {
      // ignore
    }
  };

  // Delete Table
  const handleConfirmDelete = async () => {
    if (!deletingTable) return;
    setIsLoading(true);
    try {
      const res = await deleteTableAction(deletingTable.id);
      if (res.success) {
        setTables((prev) => prev.filter((t) => t.id !== deletingTable.id));
        setDeletingTable(null);
        setFeedback({ type: "success", text: `Table ${deletingTable.label} deleted successfully.` });
      } else {
        setFeedback({ type: "error", text: res.message || "Could not delete table." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error deleting table." });
    } finally {
      setIsLoading(false);
    }
  };

  // Add Section
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    setIsLoading(true);
    try {
      const res = await createSectionAction(newSectionName.trim());
      if (res.success && res.sections) {
        setSections(res.sections);
        setNewSectionName("");
        setFeedback({ type: "success", text: res.message || "Section added!" });
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to add section." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error creating section." });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Section
  const handleDeleteSection = async (name: string) => {
    setIsLoading(true);
    try {
      const res = await deleteSectionAction(name);
      if (res.success && res.sections) {
        setSections(res.sections);
        if (selectedSection === name) setSelectedSection("ALL");
        setFeedback({ type: "success", text: res.message || "Section removed." });
      } else {
        setFeedback({ type: "error", text: res.message || "Cannot remove section." });
      }
    } catch {
      setFeedback({ type: "error", text: "Error removing section." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-mono transition-all border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-stone-500 hover:text-stone-900 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-[#241F1C] dark:text-white">
              Dining Tables & Floor Sections
            </h1>
            <span className="rounded-full bg-[#B72E35]/15 dark:bg-[#B72E35]/30 text-[#B72E35] dark:text-[#FF6B6B] px-2.5 py-0.5 text-xs font-mono font-bold">
              {tables.length} Tables
            </span>
          </div>
          <p className="font-mono text-xs text-[#725039] dark:text-stone-400 mt-0.5">
            Add, edit, and organize dining tables into zones with QR code & JSON Tag generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsSectionsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-[#FAF4EB] dark:bg-stone-900 px-3.5 py-2 text-xs font-mono font-bold text-[#241F1C] dark:text-white hover:bg-[#F3E7D3] dark:hover:bg-stone-800 transition shadow-xs"
          >
            <Layers className="h-4 w-4 text-[#B72E35] dark:text-[#F2C84B]" />
            <span>Manage Sections</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-2xl bg-[#B72E35] hover:bg-[#9B252B] px-4 py-2 text-xs font-mono font-bold text-white shadow-md shadow-red-950/20 active:scale-95 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1C1815] p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[#725039] dark:text-stone-400">Total Tables</span>
            <Armchair className="h-4 w-4 text-[#B72E35] dark:text-[#F2C84B]" />
          </div>
          <p className="mt-1 text-2xl font-serif font-bold text-[#241F1C] dark:text-white">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1C1815] p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[#725039] dark:text-stone-400">Occupied</span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="mt-1 text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400">
            {stats.occupied} <span className="text-xs font-mono font-normal text-stone-500">active now</span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1C1815] p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[#725039] dark:text-stone-400">Total Capacity</span>
            <Users className="h-4 w-4 text-[#725039] dark:text-stone-400" />
          </div>
          <p className="mt-1 text-2xl font-serif font-bold text-[#241F1C] dark:text-white">
            {stats.totalSeats} <span className="text-xs font-mono font-normal text-stone-500">guests</span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1C1815] p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[#725039] dark:text-stone-400">Floor Sections</span>
            <Layers className="h-4 w-4 text-[#754CFF]" />
          </div>
          <p className="mt-1 text-2xl font-serif font-bold text-[#241F1C] dark:text-white">{sections.length}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-3">
        {/* Section Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedSection("ALL")}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-mono font-bold transition ${
              selectedSection === "ALL"
                ? "bg-[#241F1C] text-white dark:bg-white dark:text-[#241F1C] shadow-xs"
                : "bg-[#FAF4EB] text-[#725039] border border-[#C9AE8B]/40 dark:bg-stone-900 dark:text-stone-400 dark:border-stone-800 hover:bg-[#F3E7D3]"
            }`}
          >
            All Sections ({tables.length})
          </button>

          {sections.map((sec) => {
            const count = sectionCounts[sec] || 0;
            return (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-mono font-bold transition ${
                  selectedSection === sec
                    ? "bg-[#B72E35] text-white shadow-xs"
                    : "bg-[#FAF4EB] text-[#725039] border border-[#C9AE8B]/40 dark:bg-stone-900 dark:text-stone-400 dark:border-stone-800 hover:bg-[#F3E7D3]"
                }`}
              >
                {sec} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search table or section..."
            className="w-full rounded-xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-stone-900 pl-9 pr-3 py-1.5 text-xs font-mono text-[#241F1C] dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#B72E35]"
          />
        </div>
      </div>

      {/* Tables Floor Grid */}
      {filteredTables.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-[#C9AE8B]/50 dark:border-stone-800 bg-[#FAF4EB]/40 dark:bg-stone-900/40 p-6">
          <Armchair className="h-10 w-10 text-stone-400 mx-auto mb-2 opacity-50" />
          <p className="font-serif text-base font-bold text-[#241F1C] dark:text-white">No Tables Found</p>
          <p className="font-mono text-xs text-stone-500 mt-1">
            {searchQuery
              ? `No tables match "${searchQuery}". Try another search.`
              : `No tables currently assigned to "${selectedSection}".`}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#B72E35] px-3.5 py-1.5 text-xs font-mono text-white font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Table to This Section</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((t) => {
            const cleanNum = t.label.padStart(2, "0");
            const isOcc = t.isOccupied;

            return (
              <div
                key={t.id}
                className={`rounded-3xl border p-4 transition-all relative flex flex-col justify-between shadow-xs bg-[#FAF4EB] dark:bg-[#1A1715] ${
                  !t.active
                    ? "opacity-60 border-stone-300 dark:border-stone-800 grayscale"
                    : isOcc
                    ? "border-[#B72E35] shadow-md ring-1 ring-[#B72E35]/40"
                    : "border-[#C9AE8B]/40 dark:border-stone-800 hover:border-[#C9AE8B]"
                }`}
              >
                {/* Card Top: Number, Section & Occupancy */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xl font-black text-[#241F1C] dark:text-white">
                          T-{t.label}
                        </span>
                        {!t.active && (
                          <span className="text-[9px] font-mono uppercase bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.5 rounded-md">
                            Disabled
                          </span>
                        )}
                      </div>
                      <span
                        className={`inline-block mt-1 text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full border ${getSectionBadgeClass(
                          t.section
                        )}`}
                      >
                        {t.section}
                      </span>
                    </div>

                    {/* Status Dot / Toggle */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isOcc
                              ? "bg-emerald-500 animate-pulse"
                              : t.active
                              ? "bg-stone-400 dark:bg-stone-600"
                              : "bg-stone-300 dark:bg-stone-800"
                          }`}
                        />
                        <span className="text-[10px] font-mono text-stone-500">
                          {isOcc ? "Occupied" : t.active ? "Available" : "Off"}
                        </span>
                      </div>

                      <button
                        onClick={() => handleToggleActive(t)}
                        title={t.active ? "Disable Table" : "Enable Table"}
                        className="text-stone-400 hover:text-[#B72E35] transition"
                      >
                        {t.active ? (
                          <ToggleRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-stone-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Seat Info */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-[#725039] dark:text-stone-400 font-mono">
                    <Users className="h-3.5 w-3.5" />
                    <span>{t.seats} Guests Seating</span>
                  </div>
                </div>

                {/* Card Bottom: Quick Actions */}
                <div className="space-y-1.5 pt-4 border-t border-[#C9AE8B]/20 dark:border-stone-800/80 mt-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setViewingQrTable(t)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-[#F3E7D3] dark:bg-stone-800 py-1.5 text-[11px] font-mono font-semibold text-[#241F1C] dark:text-stone-300 hover:bg-[#EBDDC8] dark:hover:bg-stone-700 transition"
                    >
                      <QrCode className="h-3 w-3 text-[#B72E35] dark:text-[#F2C84B]" />
                      <span>View QR</span>
                    </button>

                    <button
                      onClick={() => setInspectingTag(createTableJsonTag(cleanNum))}
                      className="flex items-center justify-center gap-1 rounded-xl bg-[#F3E7D3] dark:bg-stone-800 py-1.5 text-[11px] font-mono font-semibold text-[#241F1C] dark:text-stone-300 hover:bg-[#EBDDC8] dark:hover:bg-stone-700 transition"
                    >
                      <Tag className="h-3 w-3 text-[#754CFF]" />
                      <span>JSON Tag</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-white dark:bg-stone-900 py-1.5 text-[11px] font-mono font-bold text-[#725039] dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                    >
                      <Edit2 className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => setDeletingTable(t)}
                      className="flex h-7 w-7 items-center justify-center rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/70 transition"
                      title="Delete Table"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD TABLE                                                        */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-[#FAF4EB] dark:bg-[#1A1715] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#B72E35]/15 text-[#B72E35]">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#241F1C] dark:text-white">Add New Table</h3>
                  <p className="text-[11px] font-mono text-stone-500">Configure floor location and seating</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-[#241F1C] dark:text-stone-300 mb-1">
                  Table Number / Label
                </label>
                <input
                  type="text"
                  required
                  value={tableLabel}
                  onChange={(e) => setTableLabel(e.target.value)}
                  placeholder="e.g. 13, 14, Verandah-A"
                  className="w-full rounded-xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm font-mono text-[#241F1C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B72E35]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#241F1C] dark:text-stone-300 mb-1">
                  Floor Section / Zone
                </label>
                <select
                  value={tableSection}
                  onChange={(e) => setTableSection(e.target.value)}
                  className="w-full rounded-xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm font-mono text-[#241F1C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B72E35]"
                >
                  {sections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#241F1C] dark:text-stone-300 mb-1">
                  Seating Capacity (Guests)
                </label>
                <div className="flex items-center gap-2">
                  {[2, 4, 6, 8].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTableSeats(s)}
                      className={`flex-1 rounded-xl py-1.5 text-xs font-mono font-bold border transition ${
                        tableSeats === s
                          ? "bg-[#B72E35] text-white border-[#B72E35]"
                          : "bg-white dark:bg-stone-900 text-[#725039] dark:text-stone-400 border-[#C9AE8B]/40 dark:border-stone-700 hover:bg-[#F3E7D3]"
                      }`}
                    >
                      {s} seats
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#F3E7D3]/60 dark:bg-stone-900/60 p-3 border border-[#C9AE8B]/30 dark:border-stone-800">
                <div>
                  <span className="block text-xs font-mono font-bold text-[#241F1C] dark:text-white">Active Status</span>
                  <span className="text-[10.5px] font-mono text-stone-500">Available for customer QR scans</span>
                </div>
                <input
                  type="checkbox"
                  checked={tableActive}
                  onChange={(e) => setTableActive(e.target.checked)}
                  className="h-5 w-5 accent-[#B72E35] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#C9AE8B]/20 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-mono text-stone-600 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-[#B72E35] hover:bg-[#9B252B] px-5 py-2 text-xs font-mono font-bold text-white shadow-md transition disabled:opacity-50"
                >
                  {isLoading ? "Adding..." : "Add Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT TABLE                                                       */}
      {/* ========================================================================= */}
      {editingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-[#FAF4EB] dark:bg-[#1A1715] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#241F1C] dark:text-white">
                    Edit Table T-{editingTable.label}
                  </h3>
                  <p className="text-[11px] font-mono text-stone-500">Update table configuration & seating</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTable(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-[#241F1C] dark:text-stone-300 mb-1">
                  Table Number / Label
                </label>
                <input
                  type="text"
                  required
                  value={tableLabel}
                  onChange={(e) => setTableLabel(e.target.value)}
                  className="w-full rounded-xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm font-mono text-[#241F1C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B72E35]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#241F1C] dark:text-stone-300 mb-1">
                  Floor Section / Zone
                </label>
                <select
                  value={tableSection}
                  onChange={(e) => setTableSection(e.target.value)}
                  className="w-full rounded-xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm font-mono text-[#241F1C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B72E35]"
                >
                  {sections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#241F1C] dark:text-stone-300 mb-1">
                  Seating Capacity (Guests)
                </label>
                <div className="flex items-center gap-2">
                  {[2, 4, 6, 8, 10].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTableSeats(s)}
                      className={`flex-1 rounded-xl py-1.5 text-xs font-mono font-bold border transition ${
                        tableSeats === s
                          ? "bg-[#B72E35] text-white border-[#B72E35]"
                          : "bg-white dark:bg-stone-900 text-[#725039] dark:text-stone-400 border-[#C9AE8B]/40 dark:border-stone-700 hover:bg-[#F3E7D3]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#F3E7D3]/60 dark:bg-stone-900/60 p-3 border border-[#C9AE8B]/30 dark:border-stone-800">
                <div>
                  <span className="block text-xs font-mono font-bold text-[#241F1C] dark:text-white">Active Status</span>
                  <span className="text-[10.5px] font-mono text-stone-500">
                    {tableActive ? "Currently online for customer orders" : "Offline / Disabled"}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={tableActive}
                  onChange={(e) => setTableActive(e.target.checked)}
                  className="h-5 w-5 accent-[#B72E35] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#C9AE8B]/20 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="rounded-xl px-4 py-2 text-xs font-mono text-stone-600 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-[#B72E35] hover:bg-[#9B252B] px-5 py-2 text-xs font-mono font-bold text-white shadow-md transition disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION                                              */}
      {/* ========================================================================= */}
      {deletingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl border border-rose-200 dark:border-rose-900 bg-[#FAF4EB] dark:bg-[#1A1715] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#241F1C] dark:text-white">Delete Table?</h3>
                <p className="text-xs font-mono text-stone-500">Table T-{deletingTable.label} ({deletingTable.section})</p>
              </div>
            </div>

            <p className="text-xs font-mono text-[#725039] dark:text-stone-300 leading-relaxed">
              Are you sure you want to permanently remove this dining table? The associated QR code token will also be
              deleted.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTable(null)}
                className="rounded-xl px-3.5 py-1.5 text-xs font-mono text-stone-600 dark:text-stone-400 hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isLoading}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-1.5 text-xs font-mono font-bold text-white shadow-md disabled:opacity-50"
              >
                {isLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MANAGE SECTIONS                                                  */}
      {/* ========================================================================= */}
      {isSectionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-[#FAF4EB] dark:bg-[#1A1715] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#754CFF]/15 text-[#754CFF]">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#241F1C] dark:text-white">Floor Sections</h3>
                  <p className="text-[11px] font-mono text-stone-500">Create and organize café seating zones</p>
                </div>
              </div>
              <button
                onClick={() => setIsSectionsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Add Section Form */}
            <form onSubmit={handleAddSection} className="flex items-center gap-2">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="New section name (e.g. Rooftop Deck)"
                className="flex-1 rounded-xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs font-mono text-[#241F1C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B72E35]"
              />
              <button
                type="submit"
                disabled={isLoading || !newSectionName.trim()}
                className="rounded-xl bg-[#B72E35] hover:bg-[#9B252B] px-3.5 py-2 text-xs font-mono font-bold text-white shadow-xs disabled:opacity-50 shrink-0"
              >
                Add
              </button>
            </form>

            {/* Existing Sections List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <span className="text-[10.5px] font-mono uppercase text-stone-500 block font-bold">Existing Zones</span>
              {sections.map((sec) => {
                const count = sectionCounts[sec] || 0;
                const isDefault = ["Indoor Cozy", "Courtyard Verandah", "Garden Terrace", "Brew Bar"].includes(sec);

                return (
                  <div
                    key={sec}
                    className="flex items-center justify-between rounded-xl bg-white dark:bg-stone-900 p-2.5 border border-[#C9AE8B]/30 dark:border-stone-800"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold text-[#241F1C] dark:text-white block">{sec}</span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {count} table(s) assigned {isDefault && "• Default"}
                      </span>
                    </div>

                    {!isDefault && count === 0 && (
                      <button
                        onClick={() => handleDeleteSection(sec)}
                        className="text-stone-400 hover:text-rose-600 p-1"
                        title="Delete Section"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#C9AE8B]/20 dark:border-stone-800">
              <button
                onClick={() => setIsSectionsModalOpen(false)}
                className="rounded-xl bg-[#241F1C] dark:bg-white text-white dark:text-[#241F1C] px-4 py-2 text-xs font-mono font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: QR CODE VIEWER                                                   */}
      {/* ========================================================================= */}
      {viewingQrTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-[#FAF4EB] dark:bg-[#1A1715] p-6 shadow-2xl text-center space-y-4">
            <button
              onClick={() => setViewingQrTable(null)}
              className="absolute right-4 top-4 text-stone-400 hover:text-stone-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <span className="font-serif text-2xl font-bold text-[#241F1C] dark:text-white block">
                Table T-{viewingQrTable.label}
              </span>
              <span className="text-xs font-mono text-[#B72E35] dark:text-[#F2C84B] font-bold">
                {viewingQrTable.section}
              </span>
            </div>

            {/* QR Simulation Box */}
            <div className="mx-auto w-48 h-48 rounded-2xl bg-white p-4 shadow-md border-2 border-stone-800 flex flex-col items-center justify-center space-y-2">
              <QrCode className="h-32 w-32 text-stone-950" strokeWidth={1.5} />
              <span className="text-[10px] font-mono font-bold text-stone-700 uppercase">
                table-{viewingQrTable.label.toLowerCase()}
              </span>
            </div>

            <p className="text-[11px] font-mono text-stone-500">
              Scans open: <code className="text-[#B72E35]">/t/table-{viewingQrTable.label.toLowerCase()}</code>
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Link
                href={`/t/table-${viewingQrTable.label.toLowerCase()}`}
                target="_blank"
                className="flex items-center gap-1 rounded-xl bg-[#241F1C] dark:bg-stone-800 text-white px-3.5 py-2 text-xs font-mono font-bold hover:bg-stone-800 transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Live Table</span>
              </Link>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 rounded-xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2 text-xs font-mono font-bold text-[#725039] dark:text-stone-300 hover:bg-[#F3E7D3] transition"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Tag Inspector Modal */}
      {inspectingTag && (
        <JsonTagInspectorModal tag={inspectingTag} onClose={() => setInspectingTag(null)} />
      )}
    </div>
  );
};
