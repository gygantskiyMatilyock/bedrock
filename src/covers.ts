// Cover keys are stored on notes and validated by the server as [a-z0-9-], so the
// gradients themselves live only in the client and can be retuned freely.
export const covers: Record<string, { label: string; background: string }> = {
  aurora: {
    label: "Aurora",
    background:
      "radial-gradient(at 12% 18%, #c4b5fd 0, transparent 55%), radial-gradient(at 78% 12%, #f9a8d4 0, transparent 50%), radial-gradient(at 62% 88%, #93c5fd 0, transparent 55%), radial-gradient(at 8% 92%, #a5f3fc 0, transparent 45%), linear-gradient(120deg, #ede9fe, #fce7f3)",
  },
  lagoon: {
    label: "Lagoon",
    background:
      "radial-gradient(at 20% 30%, #5eead4 0, transparent 55%), radial-gradient(at 85% 20%, #93c5fd 0, transparent 50%), radial-gradient(at 55% 95%, #a5b4fc 0, transparent 55%), linear-gradient(135deg, #ccfbf1, #dbeafe)",
  },
  ember: {
    label: "Ember",
    background:
      "radial-gradient(at 15% 25%, #fdba74 0, transparent 55%), radial-gradient(at 80% 15%, #fda4af 0, transparent 50%), radial-gradient(at 60% 90%, #fcd34d 0, transparent 50%), linear-gradient(135deg, #ffedd5, #ffe4e6)",
  },
  meadow: {
    label: "Meadow",
    background:
      "radial-gradient(at 18% 22%, #bef264 0, transparent 50%), radial-gradient(at 82% 30%, #6ee7b7 0, transparent 55%), radial-gradient(at 45% 95%, #99f6e4 0, transparent 50%), linear-gradient(135deg, #ecfccb, #d1fae5)",
  },
  dusk: {
    label: "Dusk",
    background:
      "radial-gradient(at 10% 20%, #818cf8 0, transparent 55%), radial-gradient(at 75% 10%, #c084fc 0, transparent 50%), radial-gradient(at 80% 95%, #fb923c 0, transparent 50%), linear-gradient(135deg, #4c1d95, #be185d)",
  },
  nebula: {
    label: "Nebula",
    background:
      "radial-gradient(at 25% 30%, #7c3aed 0, transparent 55%), radial-gradient(at 80% 25%, #2563eb 0, transparent 50%), radial-gradient(at 55% 90%, #db2777 0, transparent 55%), linear-gradient(135deg, #1e1b4b, #312e81)",
  },
  citrus: {
    label: "Citrus",
    background:
      "radial-gradient(at 20% 20%, #fde047 0, transparent 55%), radial-gradient(at 85% 35%, #fb923c 0, transparent 50%), radial-gradient(at 40% 95%, #a3e635 0, transparent 50%), linear-gradient(135deg, #fef9c3, #ffedd5)",
  },
  mist: {
    label: "Mist",
    background:
      "radial-gradient(at 15% 20%, #e2e8f0 0, transparent 55%), radial-gradient(at 85% 30%, #ddd6fe 0, transparent 50%), radial-gradient(at 50% 95%, #cbd5e1 0, transparent 55%), linear-gradient(135deg, #f8fafc, #ede9fe)",
  },
};

export const coverKeys = Object.keys(covers);

export const coverStyle = (key?: string) =>
  key && covers[key] ? { background: covers[key].background } : undefined;

export const randomCover = (current?: string) => {
  const choices = coverKeys.filter((key) => key !== current);
  return choices[Math.floor(Math.random() * choices.length)];
};

export const emojis = [
  "📝", "📌", "💡", "🧠", "🌱", "🌿", "🪨", "🔭",
  "📚", "📖", "✍️", "🎯", "🛠️", "🚀", "🧭", "🗺️",
  "🕯️", "☕", "🌙", "☀️", "🌊", "🔥", "⭐", "✨",
  "🎨", "🎧", "📷", "🧪", "🧩", "💬", "❤️", "🌸",
  "📅", "✅", "📈", "💼", "🏡", "✈️", "🍃", "🦋",
];
