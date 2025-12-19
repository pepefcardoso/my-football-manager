import { FinancialCategory } from "../../domain/enums";
import type { ValidationResult } from "../BaseService";
import { getBalanceValue } from "../../engine/GameBalanceConfig";

const CONTRACT_CONFIG = getBalanceValue("CONTRACT");

export class FinancialOperationValidator {
  static validateAmount(amount: number): ValidationResult {
    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      return {
        isValid: false,
        errors: ["O valor financeiro deve ser um número válido."],
      };
    }

    if (amount <= 0) {
      return {
        isValid: false,
        errors: ["O valor da transação deve ser positivo."],
      };
    }

    return { isValid: true };
  }

  static validateCategory(category: string): ValidationResult {
    const validCategories = Object.values(FinancialCategory) as string[];

    if (!validCategories.includes(category)) {
      return {
        isValid: false,
        errors: [`Categoria financeira inválida: ${category}`],
      };
    }

    return { isValid: true };
  }

  static validateBudget(currentBudget: number, cost: number): ValidationResult {
    if (currentBudget < cost) {
      return {
        isValid: false,
        errors: [
          `Orçamento insuficiente para operação. Disponível: €${currentBudget}, Necessário: €${cost}`,
        ],
      };
    }

    return { isValid: true };
  }

  static validateWage(
    wage: number,
    isYouth: boolean = false
  ): ValidationResult {
    const baseValidation = this.validateAmount(wage);
    if (!baseValidation.isValid) return baseValidation;

    const minWage = isYouth
      ? CONTRACT_CONFIG.MIN_WAGE_YOUTH
      : CONTRACT_CONFIG.MIN_WAGE_SENIOR;

    if (wage < minWage) {
      return {
        isValid: false,
        errors: [`O salário mínimo permitido é €${minWage}.`],
      };
    }

    return { isValid: true };
  }

  static validateRecordInput(
    amount: number,
    category: string
  ): ValidationResult {
    const amountCheck = this.validateAmount(amount);
    const categoryCheck = this.validateCategory(category);

    return this.combine(amountCheck, categoryCheck);
  }

  static combine(...results: ValidationResult[]): ValidationResult {
    const errors: string[] = [];
    for (const res of results) {
      if (!res.isValid && res.errors) {
        errors.push(...res.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
