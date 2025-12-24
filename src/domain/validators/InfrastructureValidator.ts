import { InfrastructureEconomics } from "../../engine/InfrastructureEconomics";
import type {
  UpgradeValidationContext,
  UpgradeValidationResult,
} from "../types/InfrastructureTypes";

export class InfrastructureValidator {
  static validateUpgrade(
    context: UpgradeValidationContext
  ): UpgradeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (context.hasActiveConstruction) {
      errors.push("Já existe uma obra em andamento. Aguarde a finalização.");
      return {
        isValid: false,
        canAfford: true,
        meetsPrerequisites: false,
        withinLimits: true,
        errors,
        warnings,
      };
    }

    const canAfford = context.currentBudget >= context.upgradeCost;
    if (!canAfford) {
      errors.push(
        `Saldo insuficiente. Custo: €${context.upgradeCost.toLocaleString()}, Disponível: €${context.currentBudget.toLocaleString()}`
      );
    }

    let withinLimits = true;
    if (context.upgradeType === "stadium_capacity") {
      const maxCap = InfrastructureEconomics.getMaxStadiumCapacity();
      if (context.currentValue >= maxCap) {
        errors.push(
          `Capacidade máxima do estádio atingida (${maxCap.toLocaleString()}).`
        );
        withinLimits = false;
      }
    } else {
      const maxLevel = InfrastructureEconomics.getMaxFacilityLevel();
      if (context.currentValue >= maxLevel) {
        errors.push(`Nível máximo atingido (${maxLevel}).`);
        withinLimits = false;
      }
    }

    if (canAfford) {
      const remaining = context.currentBudget - context.upgradeCost;
      const safetyThreshold = this.calculateSafetyThreshold(
        context.teamReputation
      );

      if (remaining < safetyThreshold) {
        warnings.push(
          `Atenção: O caixa ficará muito baixo (€${remaining.toLocaleString()}) para o padrão do seu clube.`
        );
        warnings.push(
          `Recomendamos manter pelo menos €${safetyThreshold.toLocaleString()} para despesas operacionais.`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      canAfford,
      meetsPrerequisites: !context.hasActiveConstruction,
      withinLimits,
      errors,
      warnings,
    };
  }

  private static calculateSafetyThreshold(reputation: number): number {
    if (reputation >= 7000) return 1_000_000;
    if (reputation >= 4000) return 250_000;
    if (reputation < 2000) return 20_000;
    return 50_000;
  }
}
