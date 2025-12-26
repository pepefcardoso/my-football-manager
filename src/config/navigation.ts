import type { MenuOption } from "../domain/constants";

export type MenuGroupKey = "club" | "market" | "competition";

export interface MenuItem {
  id: MenuOption;
  icon: string;
  label: string;
  group: MenuGroupKey;
}

export const MENU_GROUPS: Record<MenuGroupKey, string> = {
  club: "Clube",
  market: "Mercado",
  competition: "Competição",
};

export const MENU_ITEMS: MenuItem[] = [
  { id: "club", icon: "🏛️", label: "Visão Geral", group: "club" },
  { id: "squad", icon: "⚽", label: "Elenco", group: "club" },
  { id: "staff", icon: "👔", label: "Staff", group: "club" },
  { id: "youth", icon: "🎓", label: "Academia", group: "club" },
  { id: "infrastructure", icon: "🏗️", label: "Infraestrutura", group: "club" },
  { id: "transfer", icon: "🔄", label: "Transfer Hub", group: "market" },
  { id: "finances", icon: "💰", label: "Finanças", group: "market" },
  { id: "matches", icon: "🎮", label: "Jogos", group: "competition" },
  { id: "calendar", icon: "📅", label: "Calendário", group: "competition" },
  { id: "competitions", icon: "🏆", label: "Tabelas", group: "competition" },
];
