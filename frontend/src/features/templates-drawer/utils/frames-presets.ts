import type { FramePreset } from "../schema/template";

// 96dpi reference
export const FRAME_PRESETS: Record<
  Exclude<FramePreset, "custom">,
  { label: string; width: number; height: number }
> = {
  "a4-p": { label: "A4 Retrato", width: 794, height: 1123 },
  "a4-l": { label: "A4 Paisagem", width: 1123, height: 794 },
  "a3-p": { label: "A3 Retrato", width: 1123, height: 1587 },
  "a3-l": { label: "A3 Paisagem", width: 1587, height: 1123 },
  "slide-16-9": { label: "Slide 16:9", width: 1280, height: 720 },
};

export const PRESET_LIST: Array<{ id: FramePreset; label: string }> = [
  { id: "a4-p", label: "A4 Retrato" },
  { id: "a4-l", label: "A4 Paisagem" },
  { id: "a3-p", label: "A3 Retrato" },
  { id: "a3-l", label: "A3 Paisagem" },
  { id: "slide-16-9", label: "Slide 16:9" },
  { id: "custom", label: "Personalizado" },
];