"use client";

import React, { useState } from "react";
import { Sparkles, Shuffle, X } from "lucide-react";

interface PromptCard {
  id: number;
  category: "Warm & Cozy" | "Quirky & Fun" | "Deep Thoughts" | "Café Tales";
  tag: string;
  prompt: string;
  subtext: string;
}

const PROMPT_CARDS: PromptCard[] = [
  {
    id: 1,
    category: "Warm & Cozy",
    tag: "Scent & Memory",
    prompt: "What is a simple everyday scent that instantly transports you back to childhood?",
    subtext: "Rain on asphalt, freshly baked bread, old books, or mom's cardamom chai?",
  },
  {
    id: 2,
    category: "Quirky & Fun",
    tag: "House Rules",
    prompt:
      "If you had to open a quirky café tomorrow, what would be your signature drink and one unusual house rule?",
    subtext: "e.g. 10% discount if you tell the barista a clean dad joke.",
  },
  {
    id: 3,
    category: "Deep Thoughts",
    tag: "Time Machine",
    prompt:
      "If you could relive any single 24-hour day from your past just to soak in the feeling again, which day would it be?",
    subtext: "No changing outcomes — just pure nostalgia and presence.",
  },
  {
    id: 4,
    category: "Café Tales",
    tag: "Soundtrack",
    prompt: "What is a song that feels like a warm hug on a rainy evening?",
    subtext: "Pass the phone or hum the melody to the table.",
  },
  {
    id: 5,
    category: "Quirky & Fun",
    tag: "Obscure Mastery",
    prompt:
      "If you could instantly wake up as a world-class master of one obscure, non-useful skill, what would you choose?",
    subtext:
      "e.g. Perfect latte art blindfolded, skipping stones 50 times, or guessing song tempos.",
  },
  {
    id: 6,
    category: "Warm & Cozy",
    tag: "Best Meal Ever",
    prompt:
      "What is the single most memorable meal or roadside bite you've ever had, and who were you sitting with?",
    subtext: "Sometimes it's 2 AM roadside Maggi with best friends.",
  },
  {
    id: 7,
    category: "Deep Thoughts",
    tag: "Small Joys",
    prompt:
      "What is an unpopular opinion or tiny guilty pleasure that you will passionately defend forever?",
    subtext:
      "Dipping fries in ice cream, loving airport layovers, or rewatching the same comfort show?",
  },
];

interface ConversationDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConversationDeckModal: React.FC<ConversationDeckModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [deck, setDeck] = useState<PromptCard[]>(PROMPT_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!isOpen) return null;

  const currentCard = deck[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % deck.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + deck.length) % deck.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-stone-800 bg-[#1C1917] p-6 text-white shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#F6AD55]" />
            <div>
              <h3 className="text-sm font-bold tracking-tight text-[#F6AD55]">
                Conversation Prompt Deck
              </h3>
              <p className="text-[10px] text-stone-400 font-mono">
                Card {currentIndex + 1} of {deck.length} • Smol Café Edition
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-stone-800 p-1.5 text-stone-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tactile Prompt Card */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="cursor-pointer min-h-[220px] rounded-3xl border-2 border-stone-700 bg-stone-900 p-6 flex flex-col justify-between shadow-inner transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {currentCard.category}
              </span>
              <span className="text-[11px] font-mono text-stone-400">{currentCard.tag}</span>
            </div>

            <p className="mt-4 text-base font-bold leading-snug text-stone-100">
              &ldquo;{currentCard.prompt}&rdquo;
            </p>
          </div>

          <div className="pt-4 border-t border-stone-800">
            <p className="text-[11px] text-stone-400 italic">{currentCard.subtext}</p>
          </div>
        </div>

        {/* Deck Navigation Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handlePrev}
            className="rounded-2xl border border-stone-700 bg-stone-800/80 px-3.5 py-2 text-xs font-bold text-stone-300 hover:bg-stone-700"
          >
            ← Prev
          </button>

          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 rounded-2xl border border-amber-900/60 bg-amber-950/40 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-900/40"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span>Shuffle</span>
          </button>

          <button
            onClick={handleNext}
            className="rounded-2xl bg-[#9B2C2C] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#822424] active:scale-95"
          >
            Draw Next →
          </button>
        </div>
      </div>
    </div>
  );
};
