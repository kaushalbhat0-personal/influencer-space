export interface StoreExample {
  id: string;
  name: string;
  category: string;
  description: string;
  placeholder: string;
  url?: string;
}

export const EXAMPLES: StoreExample[] = [
  {
    id: "fitness",
    name: "FitWithPriya",
    category: "Fitness Coach",
    description: "Workout programs, meal plans, and one-on-one coaching bookings.",
    placeholder: "from-emerald-900 via-zinc-900 to-zinc-950",
  },
  {
    id: "finance",
    name: "MarketMinute",
    category: "Finance Educator",
    description: "Stock market courses, investment guides, and live webinar subscriptions.",
    placeholder: "from-blue-900 via-zinc-900 to-zinc-950",
  },
  {
    id: "tech",
    name: "ByteSized",
    category: "Tech Creator",
    description: "Coding tutorials, developer tools, and digital templates.",
    placeholder: "from-indigo-900 via-zinc-900 to-zinc-950",
  },
  {
    id: "photo",
    name: "Lens & Light",
    category: "Photographer",
    description: "Preset packs, Lightroom tutorials, and print sales.",
    placeholder: "from-violet-900 via-zinc-900 to-zinc-950",
  },
  {
    id: "chef",
    name: "SpiceRoute",
    category: "Chef",
    description: "Recipe ebooks, cooking masterclasses, and spice kit pre-orders.",
    placeholder: "from-amber-900 via-zinc-900 to-zinc-950",
  },
  {
    id: "music",
    name: "BeatLab",
    category: "Musician",
    description: "Sample packs, production courses, and exclusive track downloads.",
    placeholder: "from-rose-900 via-zinc-900 to-zinc-950",
  },
];
