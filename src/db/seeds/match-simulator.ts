export interface SimpleMatchResult {
  homeScore: number;
  awayScore: number;
  winnerId: number | null;
}

/**
 * Simula um placar rápido baseado na reputação dos times
 */
export function quickSimulateMatch(
  homeRep: number,
  awayRep: number
): SimpleMatchResult {
  const homeAdvantage = 1.15;

  const diff = homeRep * homeAdvantage - awayRep;

  let homeExpectancy = 1.4 + diff / 2000;
  let awayExpectancy = 1.1 - diff / 2000;

  homeExpectancy = Math.max(0.2, homeExpectancy);
  awayExpectancy = Math.max(0.2, awayExpectancy);

  const getGoals = (lambda: number) => {
    const L = Math.exp(-lambda);
    let p = 1.0;
    let k = 0;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  };

  const homeScore = getGoals(homeExpectancy);
  const awayScore = getGoals(awayExpectancy);

  return {
    homeScore,
    awayScore,
    winnerId: homeScore > awayScore ? 1 : homeScore < awayScore ? 2 : null,
  };
}
