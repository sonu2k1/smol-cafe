"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  BookOpen,
  Search,
  Clock,
  Flame,
  ChefHat,
  Plus,
  Edit3,
  Check,
  X,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Utensils,
  Layers,
  Thermometer,
  ShieldAlert,
  Save,
  Trash2,
} from "lucide-react";
import { type KitchenMenuItem, fetchKitchenMenuCatalogAction } from "@/app/kitchen/menu-actions";

export interface RecipeIngredient {
  name: string;
  quantity: string;
  notes?: string;
}

export interface RecipeStep {
  stepNumber: number;
  title: string;
  instruction: string;
  durationSeconds?: number;
  heatLevel?: "Off" | "Low Heat" | "Medium Flame" | "High Flame" | "Brew Temp (92°C)";
}

export interface RecipeDetail {
  itemId: string;
  dishName: string;
  station: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: "Beginner (Easy)" | "Intermediate" | "Chef Special";
  servingWare: string;
  idealTemperature: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  proTips: string[];
  substitutions: string[];
  allergens: string[];
}

// Master Pre-seeded Artisanal Recipes for Smol Café standard menu
const DEFAULT_RECIPES: Record<string, RecipeDetail> = {
  item_croissant_butter: {
    itemId: "item_croissant_butter",
    dishName: "Flaky Butter Croissant",
    station: "Bakery & Bakes",
    prepTimeMinutes: 2,
    cookTimeMinutes: 4,
    difficulty: "Beginner (Easy)",
    servingWare: "Small Terracotta Oval Plate with parchment liner",
    idealTemperature: "Warm (60°C)",
    ingredients: [
      { name: "Pre-laminated Croissant", quantity: "1 piece (fresh batch)", notes: "Room temp" },
      { name: "French Salted Butter", quantity: "10g pat", notes: "Served on the side" },
      { name: "Sea Salt Flakes (Maldon)", quantity: "1 pinch", notes: "Top garnish" },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Pre-heat & Prep",
        instruction: "Preheat convection toaster oven to 175°C. Slice croissant horizontally 80% through if serving with butter.",
        durationSeconds: 60,
        heatLevel: "Medium Flame",
      },
      {
        stepNumber: 2,
        title: "Flash Toast for Crispiness",
        instruction: "Bake on baking parchment for exactly 3.5 minutes until exterior layers turn golden, crackly, and fragrant.",
        durationSeconds: 210,
        heatLevel: "Medium Flame",
      },
      {
        stepNumber: 3,
        title: "Plating & Serve",
        instruction: "Place diagonally on terracotta plate. Sprinkle delicate sea salt flakes on top and place butter quenelle beside it.",
        durationSeconds: 30,
        heatLevel: "Off",
      },
    ],
    proTips: [
      "Do NOT microwave! Microwaving makes the laminated layers soggy and chewy.",
      "If the croissant was baked in the morning, a 3-minute flash toast revives 100% of crispiness.",
    ],
    substitutions: ["Vegan Butter available in fridge shelf 2 for vegan guests."],
    allergens: ["Gluten", "Dairy"],
  },
  item_pour_over: {
    itemId: "item_pour_over",
    dishName: "Ratnagiri Pour Over",
    station: "Brew Bar & Beverages",
    prepTimeMinutes: 2,
    cookTimeMinutes: 3,
    difficulty: "Intermediate",
    servingWare: "Amber Glass Carafe + Ribbed Ceramic Tasting Cup",
    idealTemperature: "88°C - 92°C",
    ingredients: [
      { name: "Ratnagiri Estate Specialty Beans", quantity: "18.5g", notes: "Medium-coarse grind (Setting 16 on Fellow Ode)" },
      { name: "Filtered RO Water (92°C)", quantity: "285ml", notes: "1:15.4 brew ratio" },
      { name: "Hario V60 Paper Filter", quantity: "1 sheet", notes: "Pre-rinsed thoroughly" },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Filter Rinse & Grind",
        instruction: "Rinse paper filter with hot water to wash away paper taste and pre-warm carafe. Discard rinse water. Add 18.5g ground coffee and create a small center divot.",
        durationSeconds: 45,
        heatLevel: "Brew Temp (92°C)",
      },
      {
        stepNumber: 2,
        title: "Bloom Phase",
        instruction: "Pour 50g of 92°C water in gentle concentric circles. Swirl lightly once. Let coffee bloom for 45 seconds to release CO2.",
        durationSeconds: 45,
        heatLevel: "Brew Temp (92°C)",
      },
      {
        stepNumber: 3,
        title: "Main Pour (Continuous Stream)",
        instruction: "Pour steadily in clockwise spiral to 180g by 1:30, then finish pouring up to 285g by 2:15. Keep stream smooth without touching filter walls.",
        durationSeconds: 90,
        heatLevel: "Brew Temp (92°C)",
      },
      {
        stepNumber: 4,
        title: "Drawdown & Swirl",
        instruction: "Let water draw down fully (total brew time should be 2:45 to 3:00). Swirl carafe gently to oxygenate before serving.",
        durationSeconds: 30,
        heatLevel: "Off",
      },
    ],
    proTips: [
      "Water temperature must be between 91°C–93°C. Cooler water yields sour under-extraction; hotter yields bitterness.",
      "If drawdown takes longer than 3:20, grinder setting is too fine. Move to setting 18.",
    ],
    substitutions: ["Attikan Estate beans can be substituted if Ratnagiri stock is exhausted."],
    allergens: ["None (Caffeine)"],
  },
  item_sourdough_toast: {
    itemId: "item_sourdough_toast",
    dishName: "Triple Decker Sourdough",
    station: "Hot Kitchen & Grill",
    prepTimeMinutes: 5,
    cookTimeMinutes: 6,
    difficulty: "Intermediate",
    servingWare: "10-inch Artisan Stoneware Plate with knife & fork",
    idealTemperature: "Hot & Melting (70°C)",
    ingredients: [
      { name: "Smol House Sourdough Slices", quantity: "2 thick slices (18mm)", notes: "Country blonde loaf" },
      { name: "Salted French Butter", quantity: "25g", notes: "Room temp for spreading" },
      { name: "Smoked Gouda & Mozzarella Blend", quantity: "60g shredded", notes: "50/50 blend" },
      { name: "Caramelized Balsamic Onions", quantity: "30g", notes: "Pre-prepped in prep fridge" },
      { name: "Pickled Jalapeño Slices", quantity: "8-10 slices", notes: "Drained" },
      { name: "Dijon Wholegrain Mustard", quantity: "1 tsp (5g)", notes: "Spread thin" },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Bread Prep & Layering",
        instruction: "Spread thin layer of butter on outside of sourdough slices. On inside, spread Dijon mustard, layer 30g cheese, caramelized onions, jalapeños, and remaining 30g cheese.",
        durationSeconds: 90,
        heatLevel: "Off",
      },
      {
        stepNumber: 2,
        title: "Skillet Sauté / Toasting",
        instruction: "Place on pre-heated cast iron flat top at medium flame. Press gently with grill press. Sauté for 3 mins until base is dark golden with blistered crust.",
        durationSeconds: 180,
        heatLevel: "Medium Flame",
      },
      {
        stepNumber: 3,
        title: "Flip & Melt Cheese",
        instruction: "Flip carefully. Cover with cloche/lid and add 3 drops of water around pan edge to create steam that melts the cheese completely. Toast 2.5 mins.",
        durationSeconds: 150,
        heatLevel: "Low Heat",
      },
      {
        stepNumber: 4,
        title: "Diagonal Slice & Plate",
        instruction: "Rest on cutting board for 30 seconds (prevents cheese spill). Slice cleanly at a sharp 45° diagonal. Stack slightly overlapping on stoneware plate.",
        durationSeconds: 30,
        heatLevel: "Off",
      },
    ],
    proTips: [
      "Always put cheese both below and above the onions/jalapeños so it acts as glue to hold the sandwich together.",
      "The 3-drop water steam trick under the cloche gives 100% cheese pull without burning the sourdough crust.",
    ],
    substitutions: ["Vegan Mozzarella available for vegan guests with coconut oil spread instead of butter."],
    allergens: ["Gluten", "Dairy"],
  },
  item_masala_chai: {
    itemId: "item_masala_chai",
    dishName: "Himalayan Kulhad Masala Chai",
    station: "Brew Bar & Beverages",
    prepTimeMinutes: 2,
    cookTimeMinutes: 5,
    difficulty: "Beginner (Easy)",
    servingWare: "Raw Baked Terracotta Kulhad (Smoky Pre-warmed)",
    idealTemperature: "Piping Hot (85°C)",
    ingredients: [
      { name: "Assam CTC Black Tea Blend", quantity: "2 heaping tsp (8g)", notes: "Smol house blend" },
      { name: "Crushed Fresh Ginger", quantity: "15g", notes: "Pounded in mortar" },
      { name: "Fresh Green Cardamom Pods", quantity: "3 pods", notes: "Cracked open" },
      { name: "Whole Cloves & Black Peppercorn", quantity: "2 cloves, 2 peppercorns", notes: "Crushed" },
      { name: "Filtered Water", quantity: "120ml", notes: "Boiling base" },
      { name: "Full Cream Milk (A2 / Whole)", quantity: "150ml", notes: "Creamy texture" },
      { name: "Organic Jaggery / Raw Sugar", quantity: "1.5 tsp (10g)", notes: "Adjust to guest note" },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Aromatics Extraction Boil",
        instruction: "Add water, crushed ginger, cardamom, cloves, and peppercorn in brass saucepan. Bring to rolling boil for 90 seconds to extract deep herbal oils.",
        durationSeconds: 90,
        heatLevel: "High Flame",
      },
      {
        stepNumber: 2,
        title: "Add Tea Leaves & Steep",
        instruction: "Add 8g CTC tea leaves and raw sugar. Lower heat slightly and let decoction simmer for 60 seconds until dark amber red.",
        durationSeconds: 60,
        heatLevel: "Medium Flame",
      },
      {
        stepNumber: 3,
        title: "Milk Addition & 3 Rolling Boils",
        instruction: "Pour 150ml fresh milk. Increase flame. Let chai rise to rim, pull off heat for 5s, return to heat. Repeat 3 times (the 'Oobāl' technique for micro-froth).",
        durationSeconds: 120,
        heatLevel: "High Flame",
      },
      {
        stepNumber: 4,
        title: "Double Strain into Hot Kulhad",
        instruction: "Pre-warm terracotta kulhad with hot water. Double strain chai from a high 8-inch pour to build aromatic foam head. Serve immediately.",
        durationSeconds: 30,
        heatLevel: "Off",
      },
    ],
    proTips: [
      "Always crush ginger FRESH per order — never use pre-minced ginger paste, which creates a bitter sour taste.",
      "The 3-boil aeration creates the velvety creamy mouthfeel guests love.",
    ],
    substitutions: ["Oat milk version: Add oat milk at the very end and do NOT boil aggressively to prevent curdling."],
    allergens: ["Dairy"],
  },
};

export const KitchenCookbookView: React.FC = () => {
  const [menuItems, setMenuItems] = useState<KitchenMenuItem[]>([]);
  const [recipes, setRecipes] = useState<Record<string, RecipeDetail>>(DEFAULT_RECIPES);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("item_pour_over");
  const [selectedStation, setSelectedStation] = useState<string>("All Stations");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedRecipe, setEditedRecipe] = useState<RecipeDetail | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Active cooking timer
  const [activeTimerSeconds, setActiveTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerLabel, setTimerLabel] = useState<string>("");

  // Load recipes from localStorage on client
  useEffect(() => {
    try {
      const saved = localStorage.getItem("smol_chef_cookbook_v1");
      if (saved) {
        setRecipes({ ...DEFAULT_RECIPES, ...JSON.parse(saved) });
      }
    } catch {
      // safe fallback
    }

    const fetchMenu = async () => {
      try {
        const res = await fetchKitchenMenuCatalogAction();
        if (res.success && res.items.length > 0) {
          setMenuItems(res.items);
        }
      } catch {
        // safe
      }
    };
    fetchMenu();
  }, []);

  // Timer countdown loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && activeTimerSeconds !== null && activeTimerSeconds > 0) {
      interval = setInterval(() => {
        setActiveTimerSeconds((prev) => {
          if (prev === null || prev <= 1) {
            setTimerRunning(false);
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, activeTimerSeconds]);

  const activeRecipe = useMemo(() => {
    if (recipes[selectedRecipeId]) return recipes[selectedRecipeId];
    // Generate intelligent recipe template for un-seeded item
    const fallbackItem = menuItems.find((i) => i.id === selectedRecipeId);
    if (fallbackItem) {
      return {
        itemId: fallbackItem.id,
        dishName: fallbackItem.name,
        station: fallbackItem.station,
        prepTimeMinutes: 3,
        cookTimeMinutes: 5,
        difficulty: "Beginner (Easy)" as const,
        servingWare: "Smol Café Ceramic Ware with Garnish",
        idealTemperature: "Warm / Fresh",
        ingredients: [
          { name: fallbackItem.coreIngredients || "Artisanal Cafe Ingredients", quantity: "Standard batch", notes: "Fresh prep" },
          { name: "House Seasoning / Butter", quantity: "1 portion", notes: "To taste" },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Preparation & Inspection",
            instruction: `Inspect ingredients for ${fallbackItem.name}. Ensure station equipment is pre-heated and sanitised.`,
            durationSeconds: 60,
            heatLevel: "Low Heat" as const,
          },
          {
            stepNumber: 2,
            title: "Cooking & Sauté Phase",
            instruction: "Cook according to station standard guidelines until aromatic, properly textured, and golden.",
            durationSeconds: 180,
            heatLevel: "Medium Flame" as const,
          },
          {
            stepNumber: 3,
            title: "Plating & Presentation",
            instruction: "Plate neatly with house garnish and verify ticket modifier notes before dispatching to pickup shelf.",
            durationSeconds: 30,
            heatLevel: "Off" as const,
          },
        ],
        proTips: ["Always taste-test a micro batch if opening the kitchen fresh."],
        substitutions: ["Check pantry shelf for dairy-free or gluten-free alternatives."],
        allergens: [fallbackItem.dietary || "Standard"],
      };
    }
    return DEFAULT_RECIPES.item_pour_over;
  }, [recipes, selectedRecipeId, menuItems]);

  const stations = useMemo(() => {
    return [
      "All Stations",
      "Brew Bar & Beverages",
      "Hot Kitchen & Grill",
      "Bakery & Bakes",
      "Cold Prep & Bowls",
    ];
  }, []);

  const allAvailableItems = useMemo(() => {
    // Combine menu items + recipes
    const map = new Map<string, { id: string; name: string; station: string; hasDetailedRecipe: boolean }>();

    // Add predefined recipes first
    Object.values(recipes).forEach((r) => {
      map.set(r.itemId, {
        id: r.itemId,
        name: r.dishName,
        station: r.station,
        hasDetailedRecipe: true,
      });
    });

    // Add remaining menu catalog items
    menuItems.forEach((m) => {
      if (!map.has(m.id)) {
        map.set(m.id, {
          id: m.id,
          name: m.name,
          station: m.station,
          hasDetailedRecipe: false,
        });
      }
    });

    return Array.from(map.values()).filter((item) => {
      const matchStation = selectedStation === "All Stations" || item.station === selectedStation;
      const matchSearch =
        !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStation && matchSearch;
    });
  }, [recipes, menuItems, selectedStation, searchQuery]);

  const handleStartTimer = (seconds: number, title: string) => {
    setActiveTimerSeconds(seconds);
    setTimerLabel(title);
    setTimerRunning(true);
  };

  const handleSaveEditedRecipe = () => {
    if (!editedRecipe) return;
    const updated = {
      ...recipes,
      [editedRecipe.itemId]: editedRecipe,
    };
    setRecipes(updated);
    try {
      localStorage.setItem("smol_chef_cookbook_v1", JSON.stringify(updated));
    } catch {
      // safe
    }
    setIsEditing(false);
    setEditedRecipe(null);
  };

  const handleAddIngredient = () => {
    if (!editedRecipe) return;
    setEditedRecipe({
      ...editedRecipe,
      ingredients: [
        ...editedRecipe.ingredients,
        { name: "New Ingredient", quantity: "1 portion", notes: "" },
      ],
    });
  };

  const handleRemoveIngredient = (index: number) => {
    if (!editedRecipe) return;
    setEditedRecipe({
      ...editedRecipe,
      ingredients: editedRecipe.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleAddStep = () => {
    if (!editedRecipe) return;
    const newStepNum = editedRecipe.steps.length + 1;
    setEditedRecipe({
      ...editedRecipe,
      steps: [
        ...editedRecipe.steps,
        {
          stepNumber: newStepNum,
          title: `Step ${newStepNum}: New Action`,
          instruction: "Describe step details, exact heat level, and cook time.",
          durationSeconds: 120,
          heatLevel: "Medium Flame",
        },
      ],
    });
  };

  const handleRemoveStep = (index: number) => {
    if (!editedRecipe) return;
    const updatedSteps = editedRecipe.steps
      .filter((_, i) => i !== index)
      .map((step, idx) => ({ ...step, stepNumber: idx + 1 }));
    setEditedRecipe({
      ...editedRecipe,
      steps: updatedSteps,
    });
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row gap-4 p-3 sm:p-6 max-w-7xl mx-auto w-full">
      {/* LEFT SIDEBAR: Search, Station Filters, Recipe List */}
      <div className="w-full xl:w-80 shrink-0 flex flex-col gap-3">
        {/* Header Title Card */}
        <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1E1A17] p-4 shadow-sm space-y-2">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="h-5 w-5 text-[#B72E35] dark:text-[#A78BFA] shrink-0" />
              <h2 className="font-serif text-base sm:text-lg font-bold text-[#241F1C] dark:text-white leading-tight">
                Chef&apos;s Cookbook &amp; SOP
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
              Staff Backup Manual
            </span>
          </div>
          <p className="font-serif italic text-xs text-[#725039] dark:text-[#C9AE8B] leading-relaxed">
            Exact gram measurements, heat levels, sauté timings, and emergency substitution guides so any team member can step in and cook.
          </p>
        </div>

        {/* Search & Station Pills */}
        <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1E1A17] p-3 space-y-2.5 shadow-2xs">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7E72] dark:text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dish or beverage recipe..."
              className="w-full pl-10 pr-8 py-2 rounded-xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-medium text-[#241F1C] dark:text-stone-200 placeholder-[#8C7E72] dark:placeholder-stone-500 focus:outline-none focus:border-[#B72E35] focus:ring-1 focus:ring-[#B72E35]/30 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Station selector */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {stations.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStation(st)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold transition cursor-pointer ${
                  selectedStation === st
                    ? "bg-[#B72E35] text-white shadow-2xs"
                    : "bg-[#EFE7DC] dark:bg-stone-800 text-[#725039] dark:text-stone-300 hover:bg-[#E2D6C5]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Recipes Directory List */}
        <div className="flex-1 rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1E1A17] p-2 overflow-y-auto max-h-[480px] xl:max-h-[640px] space-y-1.5">
          {allAvailableItems.length === 0 ? (
            <p className="p-6 text-center font-serif italic text-xs text-[#8C7E72]">
              No dishes found matching search
            </p>
          ) : (
            allAvailableItems.map((item) => {
              const isSelected = selectedRecipeId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedRecipeId(item.id);
                    setIsEditing(false);
                    setEditedRecipe(null);
                  }}
                  className={`w-full text-left p-2.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-[#F3E7D3] dark:bg-stone-800/90 border-[#B72E35] shadow-xs"
                      : "bg-white/70 dark:bg-stone-900/40 border-[#E2D7C7]/80 dark:border-stone-800 hover:bg-white dark:hover:bg-stone-900"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="block font-serif text-xs font-bold text-[#241F1C] dark:text-stone-200 truncate">
                      {item.name}
                    </span>
                    <span className="font-mono text-[10px] text-[#725039] dark:text-stone-400">
                      {item.station}
                    </span>
                  </div>
                  {item.hasDetailedRecipe ? (
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 font-mono text-[9px] font-bold shrink-0">
                      SOP Ready
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 font-mono text-[9px] font-bold shrink-0">
                      Auto Guide
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT MAIN PANEL: Active Recipe Manual & Interactive Sauté/Brew Guide */}
      <div className="flex-1 flex flex-col rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1E1A17] p-4 sm:p-6 shadow-sm overflow-y-auto">
        {/* Floating Active Timer Widget */}
        {activeTimerSeconds !== null && (
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#B72E35] text-white p-3.5 shadow-md animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Clock className="h-5 w-5 animate-spin" style={{ animationDuration: "4s" }} />
              </div>
              <div>
                <span className="block font-mono text-xs uppercase font-bold text-white/80">
                  Active Step Timer: {timerLabel}
                </span>
                <span className="font-mono text-xl font-black">
                  {Math.floor(activeTimerSeconds / 60)}:{(activeTimerSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTimerRunning(!timerRunning)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition cursor-pointer"
              >
                {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTimerSeconds(null);
                  setTimerRunning(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Recipe Top Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-[#B72E35] text-white px-2.5 py-0.5 font-mono text-[10px] font-bold">
                {activeRecipe.station}
              </span>
              <span className="rounded-full bg-[#EFE7DC] dark:bg-stone-800 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#725039] dark:text-stone-300">
                {activeRecipe.difficulty}
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#241F1C] dark:text-white mt-1">
              {activeRecipe.dishName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setEditedRecipe(JSON.parse(JSON.stringify(activeRecipe)));
                  setIsEditing(true);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-[#C9AE8B]/60 dark:border-stone-700 bg-white dark:bg-stone-800 px-3.5 py-2 font-serif text-xs font-bold text-[#241F1C] dark:text-stone-200 shadow-xs hover:bg-[#F3E7D3]/40 transition active:scale-95 cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5 text-[#B72E35]" />
                <span>Edit Recipe SOP</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveEditedRecipe}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 font-serif text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save SOP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedRecipe(null);
                  }}
                  className="flex items-center gap-1 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-3 py-2 text-xs font-medium hover:bg-stone-300 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Essential Metrics: Prep, Cook, Serving Ware, Ideal Temp */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-4">
          <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-[#E2D7C7] dark:border-stone-800 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs text-[#725039] dark:text-stone-400 font-mono">
              <Clock className="h-3.5 w-3.5 text-[#B72E35]" />
              <span>Prep Time</span>
            </div>
            <p className="font-serif text-base font-bold text-[#241F1C] dark:text-white mt-0.5">
              {activeRecipe.prepTimeMinutes} mins
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-[#E2D7C7] dark:border-stone-800 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs text-[#725039] dark:text-stone-400 font-mono">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span>Cook / Sauté</span>
            </div>
            <p className="font-serif text-base font-bold text-[#241F1C] dark:text-white mt-0.5">
              {activeRecipe.cookTimeMinutes} mins
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-[#E2D7C7] dark:border-stone-800 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs text-[#725039] dark:text-stone-400 font-mono">
              <Thermometer className="h-3.5 w-3.5 text-emerald-500" />
              <span>Target Temp</span>
            </div>
            <p className="font-serif text-sm font-bold text-[#241F1C] dark:text-white mt-0.5 truncate">
              {activeRecipe.idealTemperature}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-[#E2D7C7] dark:border-stone-800 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs text-[#725039] dark:text-stone-400 font-mono">
              <Utensils className="h-3.5 w-3.5 text-[#754CFF]" />
              <span>Serving Ware</span>
            </div>
            <p className="font-serif text-xs font-bold text-[#241F1C] dark:text-white mt-0.5 truncate" title={activeRecipe.servingWare}>
              {activeRecipe.servingWare}
            </p>
          </div>
        </div>

        {/* INGREDIENTS SECTION (Exact Gram Ratios) */}
        <div className="rounded-3xl border border-[#E2D7C7] dark:border-stone-800 bg-white dark:bg-[#1A1614] p-4 sm:p-5 space-y-3 mb-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#B72E35]" />
              <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-white">
                Exact Ingredient Ratios &amp; Portions
              </h3>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={handleAddIngredient}
                className="flex items-center gap-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 px-2 py-0.5 text-xs font-mono font-bold cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Ingredient</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {!isEditing
              ? activeRecipe.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-2xl border border-[#E2D7C7]/70 dark:border-stone-800 bg-[#FAF4EB]/60 dark:bg-stone-900/40"
                  >
                    <div>
                      <span className="font-serif text-xs font-bold text-[#241F1C] dark:text-stone-200">
                        {ing.name}
                      </span>
                      {ing.notes && (
                        <span className="block font-mono text-[10px] text-[#8C7E72] dark:text-stone-400">
                          • {ing.notes}
                        </span>
                      )}
                    </div>
                    <span className="rounded-lg bg-[#EFE7DC] dark:bg-stone-800 px-2 py-1 font-mono text-xs font-black text-[#B72E35] dark:text-[#A78BFA] shrink-0">
                      {ing.quantity}
                    </span>
                  </div>
                ))
              : editedRecipe?.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                  >
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) => {
                        const next = [...editedRecipe.ingredients];
                        next[idx].name = e.target.value;
                        setEditedRecipe({ ...editedRecipe, ingredients: next });
                      }}
                      placeholder="Ingredient Name"
                      className="flex-1 p-1 text-xs border rounded bg-white dark:bg-stone-800 font-medium"
                    />
                    <input
                      type="text"
                      value={ing.quantity}
                      onChange={(e) => {
                        const next = [...editedRecipe.ingredients];
                        next[idx].quantity = e.target.value;
                        setEditedRecipe({ ...editedRecipe, ingredients: next });
                      }}
                      placeholder="Qty (e.g. 18g)"
                      className="w-24 p-1 text-xs border rounded bg-white dark:bg-stone-800 font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
          </div>
        </div>

        {/* STEP-BY-STEP COOKING / SAUTÉ PROCEDURE */}
        <div className="rounded-3xl border border-[#E2D7C7] dark:border-stone-800 bg-white dark:bg-[#1A1614] p-4 sm:p-5 space-y-4 mb-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-[#B72E35]" />
              <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-white">
                Step-by-Step Cooking &amp; Sauté SOP Guide
              </h3>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={handleAddStep}
                className="flex items-center gap-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 px-2 py-0.5 text-xs font-mono font-bold cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Step</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {!isEditing
              ? activeRecipe.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-3.5 rounded-2xl border border-[#E2D7C7]/80 dark:border-stone-800 bg-[#FAF4EB]/40 dark:bg-stone-900/30 space-y-2 hover:bg-[#FAF4EB]/80 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#B72E35] text-white font-mono text-xs font-bold">
                          {step.stepNumber}
                        </span>
                        <h4 className="font-serif text-sm font-bold text-[#241F1C] dark:text-white">
                          {step.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {step.heatLevel && (
                          <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 px-2.5 py-0.5 font-mono text-[10px] font-bold">
                            🔥 {step.heatLevel}
                          </span>
                        )}
                        {step.durationSeconds && (
                          <button
                            type="button"
                            onClick={() => handleStartTimer(step.durationSeconds || 60, step.title)}
                            className="flex items-center gap-1 rounded-lg bg-[#FAF4EB] dark:bg-stone-800 border border-[#C9AE8B]/40 px-2.5 py-0.5 text-[11px] font-mono font-bold text-[#B72E35] hover:bg-[#B72E35] hover:text-white transition active:scale-95 cursor-pointer shadow-2xs"
                            title="Start step timer"
                          >
                            <Play className="h-2.5 w-2.5" />
                            <span>{Math.floor(step.durationSeconds / 60)}:{(step.durationSeconds % 60).toString().padStart(2, "0")} min</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="font-serif text-xs leading-relaxed text-[#241F1C] dark:text-stone-300 pl-8">
                      {step.instruction}
                    </p>
                  </div>
                ))
              : editedRecipe?.steps.map((step, idx) => (
                  <div
                    key={step.stepNumber}
                    className="p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-500">#{step.stepNumber}</span>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const next = [...editedRecipe.steps];
                          next[idx].title = e.target.value;
                          setEditedRecipe({ ...editedRecipe, steps: next });
                        }}
                        placeholder="Step Title"
                        className="flex-1 p-1 text-xs border rounded bg-white dark:bg-stone-800 font-bold"
                      />
                      <input
                        type="number"
                        value={step.durationSeconds}
                        onChange={(e) => {
                          const next = [...editedRecipe.steps];
                          next[idx].durationSeconds = Number(e.target.value);
                          setEditedRecipe({ ...editedRecipe, steps: next });
                        }}
                        placeholder="Seconds"
                        className="w-20 p-1 text-xs border rounded bg-white dark:bg-stone-800 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <textarea
                      value={step.instruction}
                      onChange={(e) => {
                        const next = [...editedRecipe.steps];
                        next[idx].instruction = e.target.value;
                        setEditedRecipe({ ...editedRecipe, steps: next });
                      }}
                      rows={2}
                      className="w-full p-1.5 text-xs border rounded bg-white dark:bg-stone-800 font-serif leading-relaxed"
                    />
                  </div>
                ))}
          </div>
        </div>

        {/* CHEF'S PRO TIPS & EMERGENCY SUBSTITUTIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Pro Tips */}
          <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-serif text-xs font-bold">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Chef&apos;s Pro Secrets</span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#78350F] dark:text-stone-300 font-serif">
              {activeRecipe.proTips.map((tip, i) => (
                <li key={i} className="leading-relaxed">
                  ✦ {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency Substitutions */}
          <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/20 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300 font-serif text-xs font-bold">
              <ShieldAlert className="h-4 w-4 text-emerald-600" />
              <span>Chef Absent Backup Substitutions</span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#065F46] dark:text-stone-300 font-serif">
              {activeRecipe.substitutions.map((sub, i) => (
                <li key={i} className="leading-relaxed">
                  ✓ {sub}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
