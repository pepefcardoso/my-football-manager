export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
};

export const getPositionColor = (pos: string) => {
  switch (pos) {
    case "GK":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "DF":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "MF":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "FW":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
};

export const formatRole = (role: string) => {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
