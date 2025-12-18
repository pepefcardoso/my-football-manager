export interface PositionSlot {
  top: number;
  left: number;
  role: string;
}

export const FORMATION_LAYOUTS: Record<string, PositionSlot[]> = {
  "4-4-2": [
    { top: 88, left: 50, role: "GK" },
    { top: 70, left: 15, role: "DF" },
    { top: 70, left: 38, role: "DF" },
    { top: 70, left: 62, role: "DF" },
    { top: 70, left: 85, role: "DF" },
    { top: 45, left: 15, role: "MF" },
    { top: 45, left: 38, role: "MF" },
    { top: 45, left: 62, role: "MF" },
    { top: 45, left: 85, role: "MF" },
    { top: 20, left: 35, role: "FW" },
    { top: 20, left: 65, role: "FW" },
  ],
  "4-3-3": [
    { top: 88, left: 50, role: "GK" },
    { top: 70, left: 15, role: "DF" },
    { top: 70, left: 38, role: "DF" },
    { top: 70, left: 62, role: "DF" },
    { top: 70, left: 85, role: "DF" },
    { top: 45, left: 30, role: "MF" },
    { top: 45, left: 50, role: "MF" },
    { top: 45, left: 70, role: "MF" },
    { top: 20, left: 20, role: "FW" },
    { top: 20, left: 50, role: "FW" },
    { top: 20, left: 80, role: "FW" },
  ],
  "3-5-2": [
    { top: 88, left: 50, role: "GK" },
    { top: 70, left: 25, role: "DF" },
    { top: 70, left: 50, role: "DF" },
    { top: 70, left: 75, role: "DF" },
    { top: 45, left: 10, role: "MF" },
    { top: 45, left: 30, role: "MF" },
    { top: 45, left: 50, role: "MF" },
    { top: 45, left: 70, role: "MF" },
    { top: 45, left: 90, role: "MF" },
    { top: 20, left: 35, role: "FW" },
    { top: 20, left: 65, role: "FW" },
  ],
};

export const DEFAULT_LAYOUT = FORMATION_LAYOUTS["4-4-2"];
