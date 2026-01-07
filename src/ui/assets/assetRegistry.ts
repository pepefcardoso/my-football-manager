const CLUB_BADGES: Record<string, string> = {
  fla: "badges/fla.png",
  pal: "badges/pal.png",
  cam: "badges/cam.png",
  sao: "badges/sao.png",
  flu: "badges/flu.png",
  gre: "badges/gre.png",
  rbb: "badges/rbb.png",
  cap: "badges/cap.png",
  bot: "badges/bot.png",
  int: "badges/int.png",
  for: "badges/for.png",
  cor: "badges/cor.png",
  cru: "badges/cru.png",
  vas: "badges/vas.png",
  bah: "badges/bah.png",
  san: "badges/san.png",
  spt: "badges/spt.png",
  cea: "badges/cea.png",
  vit: "badges/vit.png",
  juv: "badges/juv.png",
  generic: "badges/generic.png",
};

export const getBadgePath = (badgeId: string | undefined): string => {
  if (!badgeId || !CLUB_BADGES[badgeId]) {
    return CLUB_BADGES["generic"] || "";
  }
  return CLUB_BADGES[badgeId];
};
