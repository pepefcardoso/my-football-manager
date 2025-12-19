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
    const recommendations: string[] = [];

    const financialCheck = this.validateFinancialConstraints(context);
    errors.push(...financialCheck.errors);
    warnings.push(...financialCheck.warnings);

    const technicalCheck = this.validateTechnicalLimits(context);
    errors.push(...technicalCheck.errors);
    warnings.push(...technicalCheck.warnings);

    const businessCheck = this.validateBusinessRules(context);
    errors.push(...businessCheck.errors);
    warnings.push(...businessCheck.warnings);
    recommendations.push(...businessCheck.recommendations);

    return {
      isValid: errors.length === 0,
      canAfford: financialCheck.canAfford,
      meetsPrerequisites: technicalCheck.meetsPrerequisites,
      withinLimits: technicalCheck.withinLimits,
      errors,
      warnings,
      recommendations,
    };
  }

  private static validateFinancialConstraints(
    context: UpgradeValidationContext
  ): {
    canAfford: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const config = InfrastructureEconomics.VALIDATION;

    const canAfford = context.currentBudget >= context.upgradeCost;
    if (!canAfford) {
      errors.push(
        `Orçamento insuficiente. Necessário: €${context.upgradeCost.toLocaleString()}, ` +
          `Disponível: €${context.currentBudget.toLocaleString()}`
      );
      return { canAfford: false, errors, warnings };
    }

    const remainingBudget = context.currentBudget - context.upgradeCost;
    if (remainingBudget < config.MIN_BUDGET_RESERVE_AFTER_UPGRADE) {
      errors.push(
        `O upgrade deixaria o orçamento abaixo da reserva mínima de segurança ` +
          `(€${config.MIN_BUDGET_RESERVE_AFTER_UPGRADE.toLocaleString()}). ` +
          `Saldo após upgrade: €${remainingBudget.toLocaleString()}`
      );
    }

    if (context.monthlyOperatingCosts) {
      const monthsOfReserve = remainingBudget / context.monthlyOperatingCosts;
      if (monthsOfReserve < config.MIN_OPERATING_CASHFLOW_MONTHS) {
        warnings.push(
          `Atenção: Após o upgrade, você terá apenas ${monthsOfReserve.toFixed(
            1
          )} ` +
            `meses de custos operacionais em reserva. Recomendado: ${config.MIN_OPERATING_CASHFLOW_MONTHS} meses.`
        );
      }
    }

    if (context.annualRevenue) {
      const maxSpend =
        context.annualRevenue * config.MAX_ANNUAL_INFRASTRUCTURE_SPEND;
      if (context.upgradeCost > maxSpend) {
        warnings.push(
          `Este upgrade representa ${(
            (context.upgradeCost / context.annualRevenue) *
            100
          ).toFixed(1)}% ` +
            `da receita anual. Limite recomendado: ${
              config.MAX_ANNUAL_INFRASTRUCTURE_SPEND * 100
            }%`
        );
      }
    }

    if (remainingBudget < context.currentBudget * 0.2) {
      warnings.push(
        "Este upgrade consumirá mais de 80% do orçamento disponível. " +
          "Considere se há fundos suficientes para emergências e outras operações."
      );
    }

    return { canAfford: true, errors, warnings };
  }

  private static validateTechnicalLimits(context: UpgradeValidationContext): {
    meetsPrerequisites: boolean;
    withinLimits: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    let meetsPrerequisites = true;
    let withinLimits = true;

    switch (context.facilityType) {
      case "stadium": {
        if (context.upgradeType === "expand_stadium") {
          const config = InfrastructureEconomics.STADIUM.EXPANSION;
          const newCapacity = context.currentValue + config.SEATS_PER_BLOCK;

          if (newCapacity > config.MAX_CAPACITY) {
            errors.push(
              `Capacidade máxima atingida. Limite: ${config.MAX_CAPACITY.toLocaleString()} lugares`
            );
            withinLimits = false;
          }

          if (context.currentValue < config.MIN_CAPACITY) {
            errors.push(
              `Capacidade mínima não atingida. Atual: ${context.currentValue}, ` +
                `Mínimo: ${config.MIN_CAPACITY}`
            );
            meetsPrerequisites = false;
          }
        } else if (context.upgradeType === "upgrade_stadium_quality") {
          const config = InfrastructureEconomics.STADIUM.QUALITY;
          const newQuality = context.currentValue + config.LEVEL_INCREMENT;

          if (context.currentValue >= config.MAX_QUALITY) {
            errors.push(`Qualidade máxima já atingida (${config.MAX_QUALITY})`);
            withinLimits = false;
          }

          if (newQuality > config.MAX_QUALITY) {
            errors.push(
              `O upgrade excederia a qualidade máxima. ` +
                `Atual: ${context.currentValue}, Máximo: ${config.MAX_QUALITY}`
            );
            withinLimits = false;
          }

          if (context.currentValue < config.MIN_QUALITY) {
            warnings.push(
              `Qualidade atual está abaixo do padrão mínimo recomendado (${config.MIN_QUALITY})`
            );
          }
        }
        break;
      }

      case "training": {
        const config = InfrastructureEconomics.TRAINING_CENTER.UPGRADE;
        const newQuality = context.currentValue + config.LEVEL_INCREMENT;

        if (context.currentValue >= config.MAX_QUALITY) {
          errors.push(
            `Centro de treinamento já está no nível máximo (${config.MAX_QUALITY})`
          );
          withinLimits = false;
        }

        if (newQuality > config.MAX_QUALITY) {
          errors.push(
            `O upgrade excederia a qualidade máxima do CT. ` +
              `Atual: ${context.currentValue}, Máximo: ${config.MAX_QUALITY}`
          );
          withinLimits = false;
        }

        if (context.currentValue < 50) {
          warnings.push(
            "CT abaixo da média. Investimento aqui pode reduzir lesões significativamente."
          );
        }
        break;
      }

      case "youth": {
        const config = InfrastructureEconomics.YOUTH_ACADEMY.UPGRADE;
        const newQuality = context.currentValue + config.LEVEL_INCREMENT;

        if (context.currentValue >= config.MAX_QUALITY) {
          errors.push(
            `Academia já está no nível máximo (${config.MAX_QUALITY})`
          );
          withinLimits = false;
        }

        if (newQuality > config.MAX_QUALITY) {
          errors.push(
            `O upgrade excederia a qualidade máxima da base. ` +
              `Atual: ${context.currentValue}, Máximo: ${config.MAX_QUALITY}`
          );
          withinLimits = false;
        }

        if (context.currentValue < 40) {
          warnings.push(
            "Academia subdesenvolvida. Jovens gerados terão potencial limitado."
          );
        }
        break;
      }
    }

    return { meetsPrerequisites, withinLimits, errors, warnings };
  }

  private static validateBusinessRules(context: UpgradeValidationContext): {
    errors: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (
      context.facilityType === "stadium" &&
      context.upgradeType === "expand_stadium"
    ) {
      const config = InfrastructureEconomics.ROI.STADIUM_EXPANSION;
      const expectedAnnualRevenue =
        InfrastructureEconomics.STADIUM.EXPANSION.SEATS_PER_BLOCK *
        config.ANNUAL_REVENUE_PER_SEAT;

      const paybackYears = context.upgradeCost / expectedAnnualRevenue;

      if (paybackYears > 5) {
        warnings.push(
          `ROI estimado: ${paybackYears.toFixed(1)} anos. ` +
            `Expansões geralmente se pagam em 3-4 anos com boa utilização.`
        );
      }

      recommendations.push(
        `Receita anual esperada com nova capacidade: €${expectedAnnualRevenue.toLocaleString()}`
      );
    }

    if (context.facilityType === "training") {
      recommendations.push(
        "Investimento no CT melhora condição física, reduz lesões e acelera desenvolvimento. " +
          "Benefício difícil de mensurar mas crucial para competitividade."
      );

      if (context.currentValue >= 80) {
        recommendations.push(
          "CT de elite. Considere priorizar outros investimentos a menos que necessite " +
            "vantagem marginal sobre competidores."
        );
      }
    }

    if (context.facilityType === "youth") {
      recommendations.push(
        "Academia de Base é investimento de longo prazo (6+ anos). " +
          "Retorno vem via vendas de jovens promessas ou economia em contratações."
      );

      if (context.currentValue < 60) {
        recommendations.push(
          "Considere investir na base antes de gastar alto no mercado. " +
            "Jovens desenvolvidos internamente têm melhor vínculo com o clube."
        );
      }
    }

    return { errors, warnings, recommendations };
  }

  static validateExpansion(
    currentCapacity: number,
    currentBudget: number,
    averageAttendance: number,
    expansionCost: number
  ): {
    isValid: boolean;
    isRecommended: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const config = InfrastructureEconomics.STADIUM.EXPANSION;
    const utilizationRate = averageAttendance / currentCapacity;

    if (currentBudget < expansionCost) {
      errors.push("Orçamento insuficiente para expansão");
    }

    if (currentCapacity + config.SEATS_PER_BLOCK > config.MAX_CAPACITY) {
      errors.push(`Capacidade máxima será excedida (${config.MAX_CAPACITY})`);
    }

    const pressureConfig = InfrastructureEconomics.FAN_BASE.CAPACITY_PRESSURE;
    const isRecommended = utilizationRate >= pressureConfig.THRESHOLD;

    if (utilizationRate < 0.7) {
      warnings.push(
        `Taxa de ocupação baixa (${(utilizationRate * 100).toFixed(0)}%). ` +
          "Expansão pode não ser necessária no momento."
      );
      recommendations.push(
        "Foque primeiro em melhorar resultados e satisfação da torcida " +
          "para aumentar público antes de expandir."
      );
    } else if (utilizationRate >= 0.85) {
      recommendations.push(
        `Ocupação alta (${(utilizationRate * 100).toFixed(0)}%). ` +
          "Expansão maximizará receita de bilheteria e aliviará demanda."
      );
    }

    return {
      isValid: errors.length === 0,
      isRecommended,
      errors,
      warnings,
      recommendations,
    };
  }
}
