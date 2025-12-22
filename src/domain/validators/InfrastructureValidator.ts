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
    if (context.upgradeType === "expand_stadium") {
      const maxCap = InfrastructureEconomics.STADIUM.EXPANSION.MAX_CAPACITY;
      if (context.currentValue >= maxCap) {
        errors.push(
          `Capacidade máxima do estádio atingida (${maxCap.toLocaleString()}).`
        );
        withinLimits = false;
      }
    } else {
      const maxLevel = InfrastructureEconomics.LEVELS.MAX;
      if (context.currentValue >= maxLevel) {
        errors.push(`Nível máximo atingido (${maxLevel}).`);
        withinLimits = false;
      }
    }

    if (canAfford) {
      const remaining = context.currentBudget - context.upgradeCost;
      //TODO: ajustar esse valor conforme a economia do jogo
      if (remaining < 10_000) {
        warnings.push(
          "Atenção: O caixa ficará muito baixo após este investimento."
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
}
