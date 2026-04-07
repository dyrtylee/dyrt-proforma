import * as XLSX from "xlsx";
import { FacilityInputs, ProFormaResult } from "./types";
import { inputConfigs } from "./defaults";

export function exportToExcel(inputs: FacilityInputs, result: ProFormaResult) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Assumptions ──────────────────────────────────────────────
  const assumptionRows: (string | number)[][] = [
    ["DYRT LABS — FACILITY PRO FORMA"],
    [`Generated: ${new Date().toLocaleDateString()}`],
    [],
    ["ASSUMPTIONS"],
    [],
  ];

  let lastGroup = "";
  for (const config of inputConfigs) {
    if (config.group !== lastGroup) {
      assumptionRows.push([]);
      assumptionRows.push([config.group.toUpperCase()]);
      lastGroup = config.group;
    }
    const val = inputs[config.key] as number;
    const display =
      config.format === "percent" ? val : val;
    const unit =
      config.format === "percent" ? "%" :
      config.format === "currency" || config.format === "currency-large" ? "$" : "";
    assumptionRows.push([config.label, display, unit]);
  }

  assumptionRows.push([], ["CAPEX BREAKDOWN"]);
  for (const [name, value] of Object.entries(result.capexBreakdown)) {
    assumptionRows.push([name, value]);
  }
  assumptionRows.push(["Total CAPEX", result.totalCapex]);

  const wsAssumptions = XLSX.utils.aoa_to_sheet(assumptionRows);
  wsAssumptions["!cols"] = [{ wch: 35 }, { wch: 18 }, { wch: 6 }];
  XLSX.utils.book_append_sheet(wb, wsAssumptions, "Assumptions");

  // ── Projection data ───────────────────────────────────────────────────
  const proj = result.monthlyProjections;
  const months = proj.map((p) => `Month ${p.month}`);

  // Loan amortization for interest/principal split
  const principal = result.totalCapex * (1 - inputs.equityPercentage);
  const annualRate = inputs.loanInterestRate;
  const termYears = inputs.loanTermYears;
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  let monthlyPayment = 0;
  const loanSchedule: { interest: number; principalPay: number; balance: number }[] = [];

  if (principal > 0 && annualRate > 0) {
    monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    let bal = principal;
    for (let m = 0; m < Math.max(numPayments, inputs.projectionMonths); m++) {
      if (bal <= 0) {
        loanSchedule.push({ interest: 0, principalPay: 0, balance: 0 });
      } else {
        const intPart = bal * monthlyRate;
        const prinPart = Math.min(monthlyPayment - intPart, bal);
        bal = Math.max(0, bal - prinPart);
        loanSchedule.push({ interest: intPart, principalPay: prinPart, balance: bal });
      }
    }
  } else {
    for (let m = 0; m < inputs.projectionMonths; m++) {
      loanSchedule.push({ interest: 0, principalPay: 0, balance: 0 });
    }
  }

  // Depreciation: straight-line over 7 years
  const depreciationYears = 7;
  const monthlyDepreciation = result.totalCapex / (depreciationYears * 12);

  // ── Sheet 2: Income Statement ─────────────────────────────────────────
  function isRow(label: string, values: number[], indent = 0): (string | number)[] {
    const prefix = "  ".repeat(indent);
    return [prefix + label, ...values.map((v) => Math.round(v))];
  }

  function isBlank(): (string | number)[] {
    return [""];
  }

  function isBold(label: string, values: number[]): (string | number)[] {
    return [label, ...values.map((v) => Math.round(v))];
  }

  const tippingRev = proj.map((p) => p.tippingRevenue);
  const compostRev = proj.map((p) => p.compostRevenue);
  const totalRev = proj.map((p) => p.totalRevenue);

  const sawdustCost = proj.map((p) => -p.sawdustCost);
  const digesterCost = proj.map((p) => -(p.digesterDisposalCost + p.digesterHaulingCost));
  const shippingCost = proj.map((p) => -p.shippingCost);
  const totalCogs = proj.map((_, i) => sawdustCost[i] + digesterCost[i] + shippingCost[i]);
  const grossProfit = proj.map((_, i) => totalRev[i] + totalCogs[i]);

  const laborExp = proj.map((p) => -p.laborCost);
  const rentExp = proj.map((p) => -p.facilityCost);
  const truckExp = proj.map((p) => -p.truckCost);
  const otherExp = proj.map((p) => -p.otherOpex);
  const totalOpex = proj.map((_, i) => laborExp[i] + rentExp[i] + truckExp[i] + otherExp[i]);
  const ebitda = proj.map((_, i) => grossProfit[i] + totalOpex[i]);

  const depExp = proj.map(() => -monthlyDepreciation);
  const intExp = proj.map((_, i) => -(loanSchedule[i]?.interest ?? 0));
  const ebt = proj.map((_, i) => ebitda[i] + depExp[i] + intExp[i]);
  // No tax for simplicity (pre-revenue startup)
  const netIncome = ebt;

  const isRows = [
    ["INCOME STATEMENT", ...months],
    isBlank(),
    isBold("Revenue", []),
    isRow("Tipping Fees", tippingRev, 1),
    isRow("Compost Sales", compostRev, 1),
    isBold("Total Revenue", totalRev),
    isBlank(),
    isBold("Cost of Goods Sold", []),
    isRow("Sawdust / Carbon", sawdustCost, 1),
    isRow("Digester Disposal & Hauling", digesterCost, 1),
    isRow("Compost Shipping", shippingCost, 1),
    isBold("Total COGS", totalCogs),
    isBlank(),
    isBold("Gross Profit", grossProfit),
    isRow("Gross Margin %", proj.map((_, i) => totalRev[i] !== 0 ? (grossProfit[i] / totalRev[i]) * 100 : 0)),
    isBlank(),
    isBold("Operating Expenses", []),
    isRow("Labor (incl. payroll tax)", laborExp, 1),
    isRow("Facility Rent", rentExp, 1),
    isRow("Fleet Operations", truckExp, 1),
    isRow("Other (utilities, ins, maint, supplies, admin)", otherExp, 1),
    isBold("Total Operating Expenses", totalOpex),
    isBlank(),
    isBold("EBITDA", ebitda),
    isRow("EBITDA Margin %", proj.map((_, i) => totalRev[i] !== 0 ? (ebitda[i] / totalRev[i]) * 100 : 0)),
    isBlank(),
    isRow("Depreciation", depExp, 1),
    isRow("Interest Expense", intExp, 1),
    isBlank(),
    isBold("Net Income", netIncome),
    isRow("Net Margin %", proj.map((_, i) => totalRev[i] !== 0 ? (netIncome[i] / totalRev[i]) * 100 : 0)),
  ];

  const wsIS = XLSX.utils.aoa_to_sheet(isRows);
  wsIS["!cols"] = [{ wch: 40 }, ...months.map(() => ({ wch: 14 }))];
  XLSX.utils.book_append_sheet(wb, wsIS, "Income Statement");

  // ── Sheet 3: Cash Flow Statement ──────────────────────────────────────
  const equityInvested = result.totalCapex * inputs.equityPercentage;
  const loanProceeds = principal;

  const cfRows: (string | number)[][] = [
    ["STATEMENT OF CASH FLOWS", ...months],
    [],
    isBold("Cash Flows from Operations", []),
    isRow("Net Income", netIncome, 1),
    isRow("Add: Depreciation", proj.map(() => monthlyDepreciation), 1),
    isBold("Net Cash from Operations", proj.map((_, i) => netIncome[i] + monthlyDepreciation)),
    [],
    isBold("Cash Flows from Investing", []),
    isRow("Capital Expenditures", proj.map((_, i) => i === 0 ? -result.totalCapex : 0), 1),
    isBold("Net Cash from Investing", proj.map((_, i) => i === 0 ? -result.totalCapex : 0)),
    [],
    isBold("Cash Flows from Financing", []),
    isRow("Equity Contributed", proj.map((_, i) => i === 0 ? equityInvested : 0), 1),
    isRow("Loan Proceeds", proj.map((_, i) => i === 0 ? loanProceeds : 0), 1),
    isRow("Loan Principal Repayment", proj.map((_, i) => -(loanSchedule[i]?.principalPay ?? 0)), 1),
    isBold("Net Cash from Financing", proj.map((_, i) => {
      const equity = i === 0 ? equityInvested : 0;
      const loan = i === 0 ? loanProceeds : 0;
      const repay = -(loanSchedule[i]?.principalPay ?? 0);
      return equity + loan + repay;
    })),
    [],
  ];

  // Net change and cumulative
  const netCashChange = proj.map((_, i) => {
    const ops = netIncome[i] + monthlyDepreciation;
    const inv = i === 0 ? -result.totalCapex : 0;
    const fin = (i === 0 ? equityInvested + loanProceeds : 0) - (loanSchedule[i]?.principalPay ?? 0);
    return ops + inv + fin;
  });

  const cumulativeCash: number[] = [];
  let runningCash = 0;
  for (const nc of netCashChange) {
    runningCash += nc;
    cumulativeCash.push(runningCash);
  }

  cfRows.push(
    isBold("Net Change in Cash", netCashChange),
    [],
    isBold("Cash Balance (End of Period)", cumulativeCash),
  );

  const wsCF = XLSX.utils.aoa_to_sheet(cfRows);
  wsCF["!cols"] = [{ wch: 35 }, ...months.map(() => ({ wch: 14 }))];
  XLSX.utils.book_append_sheet(wb, wsCF, "Cash Flow Statement");

  // ── Sheet 4: Balance Sheet ────────────────────────────────────────────
  const bsRows: (string | number)[][] = [
    ["BALANCE SHEET", ...months],
    [],
    isBold("ASSETS", []),
    isRow("Cash & Equivalents", cumulativeCash, 1),
    isRow("PP&E (Gross)", proj.map(() => result.totalCapex), 1),
    isRow("Less: Accumulated Depreciation", proj.map((_, i) => -(i + 1) * monthlyDepreciation), 1),
    isRow("PP&E (Net)", proj.map((_, i) => result.totalCapex - (i + 1) * monthlyDepreciation), 1),
    isBold("Total Assets", proj.map((_, i) => {
      const cash = cumulativeCash[i];
      const ppeNet = result.totalCapex - (i + 1) * monthlyDepreciation;
      return cash + ppeNet;
    })),
    [],
    isBold("LIABILITIES", []),
    isRow("Loan Payable", proj.map((_, i) => loanSchedule[i]?.balance ?? 0), 1),
    isBold("Total Liabilities", proj.map((_, i) => loanSchedule[i]?.balance ?? 0)),
    [],
    isBold("EQUITY", []),
    isRow("Contributed Capital", proj.map(() => equityInvested), 1),
  ];

  // Retained earnings = cumulative net income
  const retainedEarnings: number[] = [];
  let cumNI = 0;
  for (let i = 0; i < proj.length; i++) {
    cumNI += netIncome[i];
    retainedEarnings.push(cumNI);
  }

  bsRows.push(
    isRow("Retained Earnings", retainedEarnings, 1),
    isBold("Total Equity", proj.map((_, i) => equityInvested + retainedEarnings[i])),
    [],
    isBold("Total Liabilities + Equity", proj.map((_, i) => {
      const liab = loanSchedule[i]?.balance ?? 0;
      const equity = equityInvested + retainedEarnings[i];
      return liab + equity;
    })),
  );

  const wsBS = XLSX.utils.aoa_to_sheet(bsRows);
  wsBS["!cols"] = [{ wch: 35 }, ...months.map(() => ({ wch: 14 }))];
  XLSX.utils.book_append_sheet(wb, wsBS, "Balance Sheet");

  // ── Write ─────────────────────────────────────────────────────────────
  const filename = `Dyrt_ProForma_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
