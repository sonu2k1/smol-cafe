import React, { useState } from "react";
import type { MenuItemWithDetails } from "@/lib/queries/menu";
import { getFoodImage } from "@/lib/food-images";
import { Coffee, Flame, Sparkles } from "lucide-react";

interface MenuItemCardProps {
  item: MenuItemWithDetails;
  onOpenDetail: (item: MenuItemWithDetails) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onOpenDetail }) => {
  const [imageError, setImageError] = useState(false);
  const priceRupees = Math.round(item.pricePaise / 100);
  const dietary = (item.metadata?.dietary || "").toLowerCase();
  const isEgg = dietary.includes("egg");
  const spiceLevel = item.metadata?.spice || "";
  const pairing = item.metadata?.best_pairing || "";
  const foodImageUrl = getFoodImage(item.name, item.imageUrl);
  const isSoldOut =
    item.status === "SOLD_OUT" ||
    item.status === "INACTIVE" ||
    (item.metadata as any)?.availability === "SOLD_OUT";
  const isLowStock =
    item.status === "LOW_STOCK" || (item.metadata as any)?.availability === "LOW_STOCK";
  const lowStockCount = (item.metadata as any)?.low_stock_portions;
  const isChefSpecial = (item.metadata as any)?.chef_special;
  const chefNotes = (item.metadata as any)?.notes;

  return (
    <div
      onClick={() => onOpenDetail(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail(item);
        }
      }}
      className={`group relative flex items-start justify-between gap-3.5 rounded-2xl border p-3.5 text-left shadow-xs transition duration-200 hover-lift hover:shadow-md cursor-pointer animate-fade-in-up ${
        isSoldOut
          ? "border-stone-300 dark:border-stone-800 bg-[#EFE7DC]/50 dark:bg-[#181412] opacity-75"
          : "border-[#C9AE8B]/50 dark:border-white/10 bg-[#FAF4EB] dark:bg-[#201A17] hover:border-[#B72E35]/60 dark:hover:border-[#FF5B52]/50 active:scale-[0.98]"
      }`}
    >
      {/* Left: Arched Real Food Image */}
      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-t-full rounded-b-xl border border-[#C9AE8B]/40 dark:border-white/10 bg-[#EFE7DC] dark:bg-[#171311] shadow-inner">
        {!imageError ? (
          <img
            src={foodImageUrl}
            alt={item.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-110 ${
              isSoldOut ? "grayscale opacity-50" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#725039] dark:text-[#C9AE8B]">
            <Coffee className="h-6 w-6" />
          </div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs">
            <span className="font-mono text-[9.5px] font-black text-rose-300 tracking-wider uppercase px-1 text-center">
              86 OUT
            </span>
          </div>
        )}
      </div>

      {/* Middle: Details */}
      <div className="flex-1 min-w-0 pr-2">
        {/* Title & Dietary Dot */}
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              isEgg
                ? "bg-[#F2C84B] shadow-[0_0_6px_rgba(242,200,75,0.4)]"
                : "bg-[#75AFA7] dark:bg-[#5E9B93] shadow-[0_0_6px_rgba(117,175,167,0.4)]"
            }`}
            title={isEgg ? "Egg" : "Veg"}
          />
          <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-[#FAF4EB] group-hover:text-[#B72E35] dark:group-hover:text-[#FF5B52] transition-colors tracking-tight lowercase truncate">
            {item.name}
          </h3>
        </div>

        {/* Live Status & Chef Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {isSoldOut && (
            <span className="rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 px-1.5 py-0.5 text-[9.5px] font-mono font-bold">
              86 Sold Out
            </span>
          )}
          {isLowStock && (
            <span className="rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 text-[9.5px] font-mono font-bold">
              Only {lowStockCount || 3} left
            </span>
          )}
          {isChefSpecial && (
            <span className="flex items-center gap-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-800 px-1.5 py-0.5 text-[9.5px] font-mono font-bold">
              <Sparkles className="h-2.5 w-2.5" /> Chef&apos;s Pick
            </span>
          )}
          {spiceLevel && (
            <span className="flex items-center gap-0.5 font-serif italic text-[11px] text-[#725039] dark:text-[#C9AE8B]">
              <Flame className="h-3 w-3 text-red-500 fill-current" />
              <span>{spiceLevel}</span>
            </span>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#241F1C]/80 dark:text-[#FAF4EB]/70 font-sans">
            {item.description}
          </p>
        )}

        {/* Chef Daily Note */}
        {chefNotes && (
          <p className="mt-1 text-[10.5px] font-mono italic text-[#B72E35] dark:text-[#F2C84B] line-clamp-1">
            &ldquo;{chefNotes}&rdquo;
          </p>
        )}

        {/* Pairing info */}
        {pairing && (
          <p className="mt-0.5 font-serif italic text-[11px] text-[#725039] dark:text-[#C9AE8B] truncate">
            pairs with: {pairing}
          </p>
        )}
      </div>

      {/* Right: Price */}
      <div className="shrink-0 text-right pt-0.5">
        <span
          className={`font-mono text-sm sm:text-base font-bold ${
            isSoldOut ? "line-through text-stone-400" : "text-[#241F1C] dark:text-[#FAF4EB]"
          }`}
        >
          ₹{priceRupees}
        </span>
      </div>
    </div>
  );
};

