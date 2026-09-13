import React, { useState } from "react";
import type { MenuItemWithDetails } from "@/lib/queries/menu";
import { getFoodImage } from "@/lib/food-images";
import { Coffee, Flame } from "lucide-react";

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
      className="group relative flex items-start justify-between gap-3.5 rounded-2xl border border-[#C9AE8B]/50 bg-[#FAF4EB] p-3.5 text-left shadow-xs transition duration-200 hover:border-[#B72E35]/60 hover-lift hover:shadow-md active:scale-[0.98] cursor-pointer animate-fade-in-up"
    >
      {/* Left: Arched Real Food Image */}
      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-t-full rounded-b-xl border border-[#C9AE8B]/40 bg-[#EFE7DC] shadow-inner">
        {!imageError ? (
          <img
            src={foodImageUrl}
            alt={item.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#725039]">
            <Coffee className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Middle: Details */}
      <div className="flex-1 min-w-0 pr-2">
        {/* Title & Dietary Dot */}
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              isEgg ? "bg-[#F2C84B]" : "bg-[#75AFA7]"
            }`}
            title={isEgg ? "Egg" : "Veg"}
          />
          <h3 className="font-serif text-base font-bold text-[#241F1C] group-hover:text-[#B72E35] transition-colors tracking-tight lowercase truncate">
            {item.name}
          </h3>
        </div>

        {/* Spice Level Indicator */}
        {spiceLevel && (
          <p className="mt-0.5 flex items-center gap-1 font-serif italic text-[11px] text-[#725039]">
            <Flame className="h-3 w-3 text-red-500 fill-current" />
            <span>{spiceLevel}</span>
          </p>
        )}

        {/* Description */}
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#241F1C]/80 font-sans">
            {item.description}
          </p>
        )}

        {/* Pairing info */}
        {pairing && (
          <p className="mt-1 font-serif italic text-[11px] text-[#725039] truncate">
            pairs with: {pairing}
          </p>
        )}
      </div>

      {/* Right: Price */}
      <div className="shrink-0 text-right pt-0.5">
        <span className="font-mono text-sm sm:text-base font-bold text-[#241F1C]">
          ₹{priceRupees}
        </span>
      </div>
    </div>
  );
};

