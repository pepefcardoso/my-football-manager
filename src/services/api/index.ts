import { ElectronFinanceApi } from "./finance/ElectronFinanceApi";
import type { IFinanceApi } from "./finance/IFinanceApi";

export const financeApi: IFinanceApi = new ElectronFinanceApi();
