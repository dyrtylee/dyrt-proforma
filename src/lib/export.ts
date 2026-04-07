import * as XLSX from "xlsx";
import { FacilityInputs, ProFormaResult, MonthlyProjection } from "./types";
import { inputConfigs, groupOrder } from "./defaults";

// ── Helpers ─────────────────────────────────────────────────────────────────

type Row = (string | number | null)[];
type CellStyle = { numFmt?: string; bold?: boolean };

/** Sum a field across a slice of projections */
function sumSlice(proj: MonthlyProjection[], start: number, end: number, fn: (p: MonthlyProjection) => number): number {
  return proj.slice(start, end).reduce((s, p) => s + fn(p), 0);
}

/** Last value in a slice */
function lastInSlice(proj: MonthlyProjection[], start: number, end: number, fn: (p: MonthlyProjection) => number): number {
  const slice = proj.slice(start, end);
  return slice.length > 0 ? fn(slice[slice.length - 1]) : 0;
}

/** Build annual period ranges: Year 1 = months 1-12, Year 2 = 13-24, etc. */
function getAnnualPeriods(totalMonths: number): { label: string; start: number; end: number }[] {
  const periods: { label: string; start: number; end: number }[] = [];
  for (let y = 0; y * 12 < totalMonths; y++) {
    const start = y * 12;
    const end = Math.min((y + 1) * 12, totalMonths);
    periods.push({ label: `Year ${y + 1}`, start, end });
  }
  return periods;
}

/** Apply number formats and bold to a worksheet */
function applyFormats(ws: XLSX.WorkSheet, formats: Map<string, CellStyle>) {
  for (const [ref, style] of formats) {
    if (!ws[ref]) continue;
    if (!ws[ref].s) ws[ref].s = {};
    if (style.numFmt) ws[ref].z = style.numFmt;
  }
}

/** Set column widths */
function setCols(ws: XLSX.WorkSheet, labelWidth: number, dataCols: number, dataWidth = 16) {
  ws["!cols"] = [{ wch: labelWidth }, ...Array(dataCols).fill({ wch: dataWidth })];
}

// ── Main Export ─────────────────────────────────────────────────────────────

export function exportToExcel(inputs: FacilityInputs, result: ProFormaResult) {
  const wb = XLSX.utils.book_new();
  const proj = result.monthlyProjections;
  const periods = getAnnualPeriods(inputs.projectionMonths);
  const headers = ["", ...periods.map((p) => p.label)];
  const numYears = periods.length;

  // ── Loan amortization ───────────────────────────────────────────────────
  const principal = result.totalCapex * (1 - inputs.equityPercentage);
  const annualRate = inputs.loanInterestRate;
  const termYears = inputs.loanTermYears;
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  const loanSchedule: { interest: number; principalPay: number; balance: number }[] = [];

  if (principal > 0 && annualRate > 0) {
    const mp = (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    let bal = principal;
    for (let m = 0; m < Math.max(numPayments, inputs.projectionMonths); m++) {
      if (bal <= 0) {
        loanSchedule.push({ interest: 0, principalPay: 0, balance: 0 });
      } else {
        const intPart = bal * monthlyRate;
        const prinPart = Math.min(mp - intPart, bal);
        bal = Math.max(0, bal - prinPart);
        loanSchedule.push({ interest: intPart, principalPay: prinPart, balance: bal });
      }
    }
  } else {
    for (let m = 0; m < inputs.projectionMonths; m++) {
      loanSchedule.push({ interest: 0, principalPay: 0, balance: 0 });
    }
  }

  const depYears = 7;
  const monthlyDep = result.totalCapex / (depYears * 12);
  const equityInvested = result.totalCapex * inputs.equityPercentage;

  // ── Annual aggregation helper ─────────────────────────────────────────
  function annualRow(label: string, fn: (p: MonthlyProjection, i: number) => number, indent = false): Row {
    const prefix = indent ? "   " : "";
    return [prefix + label, ...periods.map((per) => {
      let total = 0;
      for (let m = per.start; m < per.end; m++) {
        total += fn(proj[m], m);
      }
      return Math.round(total);
    })];
  }

  function annualEndBalance(label: string, fn: (p: MonthlyProjection, i: number) => number, indent = false): Row {
    const prefix = indent ? "   " : "";
    return [prefix + label, ...periods.map((per) => Math.round(fn(proj[per.end - 1], per.end - 1)))];
  }

  function blankRow(): Row { return [""]; }

  function pctRow(label: string, numFn: (p: MonthlyProjection, i: number) => number, denFn: (p: MonthlyProjection, i: number) => number): Row {
    return [label, ...periods.map((per) => {
      let num = 0, den = 0;
      for (let m = per.start; m < per.end; m++) {
        num += numFn(proj[m], m);
        den += denFn(proj[m], m);
      }
      return den !== 0 ? `${((num / den) * 100).toFixed(1)}%` : "—";
    })];
  }

  // Pre-compute monthly arrays for non-projection data
  const monthlyInterest = proj.map((_, i) => loanSchedule[i]?.interest ?? 0);
  const monthlyPrincipalPay = proj.map((_, i) => loanSchedule[i]?.principalPay ?? 0);
  const monthlyNetIncome = proj.map((p, i) => {
    const grossP = p.totalRevenue - p.sawdustCost - p.shippingCost - p.digesterDisposalCost - p.digesterHaulingCost;
    const opex = p.laborCost + p.facilityCost + p.truckCost + p.otherOpex;
    const ebitda = grossP - opex;
    return ebitda - monthlyDep - monthlyInterest[i];
  });

  // ════════════════════════════════════════════════════════════════════════
  // SHEET 1: ASSUMPTIONS
  // ════════════════════════════════════════════════════════════════════════
  const aRows: Row[] = [
    ["DYRT LABS, INC."],
    ["Facility Pro Forma — Key Assumptions"],
    [`Prepared: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`],
    [],
    ["Assumption", "Value", "Unit"],
  ];

  for (const group of groupOrder) {
    const configs = inputConfigs.filter((c) => c.group === group);
    if (configs.length === 0) continue;
    aRows.push([]);
    aRows.push([group.toUpperCase()]);
    for (const c of configs) {
      const val = inputs[c.key] as number;
      if (c.format === "percent") {
        aRows.push([c.label, `${(val * 100).toFixed(1)}%`, ""]);
      } else if (c.format === "currency" || c.format === "currency-large") {
        aRows.push([c.label, val, "$"]);
      } else {
        aRows.push([c.label, val, ""]);
      }
    }
  }

  aRows.push([], [], ["USES OF FUNDS"], ["Item", "Amount"]);
  for (const [name, value] of Object.entries(result.capexBreakdown)) {
    aRows.push([`   ${name}`, value]);
  }
  aRows.push(["Total Capital Expenditures", result.totalCapex]);

  aRows.push([], ["SOURCES OF FUNDS"], ["Source", "Amount"]);
  aRows.push([`   Owner Equity (${(inputs.equityPercentage * 100).toFixed(0)}%)`, equityInvested]);
  aRows.push([`   Term Loan (${((1 - inputs.equityPercentage) * 100).toFixed(0)}%)`, principal]);
  aRows.push(["Total Sources", result.totalCapex]);

  if (principal > 0) {
    aRows.push([], ["DEBT TERMS"]);
    aRows.push(["   Loan Amount", principal]);
    aRows.push(["   Interest Rate", `${(annualRate * 100).toFixed(2)}%`]);
    aRows.push(["   Term (years)", termYears]);
    const mp = principal > 0 && annualRate > 0
      ? (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0;
    aRows.push(["   Monthly Payment", Math.round(mp)]);
    aRows.push(["   Total Interest", Math.round(loanSchedule.reduce((s, l) => s + l.interest, 0))]);
  }

  aRows.push([], ["KEY METRICS"]);
  aRows.push(["   Break-Even Month", result.breakEven.breakEvenMonth ?? "N/A"]);
  aRows.push(["   Break-Even (tons/day)", result.breakEven.breakEvenTonsPerDay.toFixed(1)]);
  aRows.push(["   Steady-State Net Margin", `${(result.steadyStateMargin * 100).toFixed(1)}%`]);
  aRows.push(["   CAPEX Payback (months)", result.paybackMonths ?? "N/A"]);
  aRows.push(["   Max Daily Capacity (tons)", result.maxDailyCapacityTons.toFixed(1)]);

  const wsA = XLSX.utils.aoa_to_sheet(aRows);
  setCols(wsA, 38, 2, 18);
  XLSX.utils.book_append_sheet(wb, wsA, "Assumptions");

  // ════════════════════════════════════════════════════════════════════════
  // SHEET 2: INCOME STATEMENT (Annual)
  // ════════════════════════════════════════════════════════════════════════
  const isRows: Row[] = [
    ["DYRT LABS, INC."],
    ["Pro Forma Income Statement"],
    [],
    headers,
    [],
    ["Revenue"],
    annualRow("Tipping Fees", (p) => p.tippingRevenue, true),
    annualRow("Compost Sales", (p) => p.compostRevenue, true),
    annualRow("Total Revenue", (p) => p.totalRevenue),
    blankRow(),
    ["Cost of Goods Sold"],
    annualRow("Sawdust & Carbon", (p) => -p.sawdustCost, true),
    annualRow("Digester Disposal & Hauling", (p) => -(p.digesterDisposalCost + p.digesterHaulingCost), true),
    annualRow("Compost Shipping", (p) => -p.shippingCost, true),
    annualRow("Total COGS", (p) => -(p.sawdustCost + p.digesterDisposalCost + p.digesterHaulingCost + p.shippingCost)),
    blankRow(),
    annualRow("Gross Profit", (p) => p.totalRevenue - p.sawdustCost - p.shippingCost - p.digesterDisposalCost - p.digesterHaulingCost),
    pctRow("   Gross Margin",
      (p) => p.totalRevenue - p.sawdustCost - p.shippingCost - p.digesterDisposalCost - p.digesterHaulingCost,
      (p) => p.totalRevenue),
    blankRow(),
    ["Operating Expenses"],
    annualRow("Salaries & Wages", (p) => -p.laborCost, true),
    annualRow("Rent & Occupancy", (p) => -p.facilityCost, true),
    annualRow("Fleet Operations", (p) => -p.truckCost, true),
    annualRow("General & Administrative", (p) => -p.otherOpex, true),
    annualRow("Total Operating Expenses", (p) => -(p.laborCost + p.facilityCost + p.truckCost + p.otherOpex)),
    blankRow(),
    annualRow("EBITDA", (p) => {
      const gp = p.totalRevenue - p.sawdustCost - p.shippingCost - p.digesterDisposalCost - p.digesterHaulingCost;
      return gp - p.laborCost - p.facilityCost - p.truckCost - p.otherOpex;
    }),
    pctRow("   EBITDA Margin",
      (p) => {
        const gp = p.totalRevenue - p.sawdustCost - p.shippingCost - p.digesterDisposalCost - p.digesterHaulingCost;
        return gp - p.laborCost - p.facilityCost - p.truckCost - p.otherOpex;
      },
      (p) => p.totalRevenue),
    blankRow(),
    annualRow("Depreciation & Amortization", () => -monthlyDep, true),
    annualRow("Interest Expense", (_, i) => -monthlyInterest[i], true),
    blankRow(),
    annualRow("Net Income (Loss)", (_, i) => monthlyNetIncome[i]),
    pctRow("   Net Margin", (_, i) => monthlyNetIncome[i], (p) => p.totalRevenue),
  ];

  const wsIS = XLSX.utils.aoa_to_sheet(isRows);
  setCols(wsIS, 38, numYears);
  XLSX.utils.book_append_sheet(wb, wsIS, "Income Statement");

  // ════════════════════════════════════════════════════════════════════════
  // SHEET 3: CASH FLOW STATEMENT (Annual)
  // ════════════════════════════════════════════════════════════════════════

  const cfOps = proj.map((_, i) => monthlyNetIncome[i] + monthlyDep);
  const cfInv = proj.map((_, i) => i === 0 ? -result.totalCapex : 0);
  const cfFinEquity = proj.map((_, i) => i === 0 ? equityInvested : 0);
  const cfFinLoan = proj.map((_, i) => i === 0 ? principal : 0);
  const cfFinRepay = proj.map((_, i) => -monthlyPrincipalPay[i]);
  const cfFin = proj.map((_, i) => cfFinEquity[i] + cfFinLoan[i] + cfFinRepay[i]);
  const cfNet = proj.map((_, i) => cfOps[i] + cfInv[i] + cfFin[i]);

  // Cumulative cash
  const cumCash: number[] = [];
  let rc = 0;
  for (const c of cfNet) { rc += c; cumCash.push(rc); }

  const cfRows: Row[] = [
    ["DYRT LABS, INC."],
    ["Pro Forma Statement of Cash Flows"],
    [],
    headers,
    [],
    ["Cash Flows from Operating Activities"],
    annualRow("Net Income (Loss)", (_, i) => monthlyNetIncome[i], true),
    annualRow("Depreciation & Amortization", () => monthlyDep, true),
    annualRow("Net Cash from Operations", (_, i) => cfOps[i]),
    blankRow(),
    ["Cash Flows from Investing Activities"],
    annualRow("Capital Expenditures", (_, i) => cfInv[i], true),
    annualRow("Net Cash from Investing", (_, i) => cfInv[i]),
    blankRow(),
    ["Cash Flows from Financing Activities"],
    annualRow("Owner Equity Contributions", (_, i) => cfFinEquity[i], true),
    annualRow("Loan Proceeds", (_, i) => cfFinLoan[i], true),
    annualRow("Loan Principal Repayments", (_, i) => cfFinRepay[i], true),
    annualRow("Net Cash from Financing", (_, i) => cfFin[i]),
    blankRow(),
    annualRow("Net Increase (Decrease) in Cash", (_, i) => cfNet[i]),
    blankRow(),
    annualEndBalance("Cash — End of Period", (_, i) => cumCash[i]),
  ];

  const wsCF = XLSX.utils.aoa_to_sheet(cfRows);
  setCols(wsCF, 38, numYears);
  XLSX.utils.book_append_sheet(wb, wsCF, "Cash Flows");

  // ════════════════════════════════════════════════════════════════════════
  // SHEET 4: BALANCE SHEET (Annual, end-of-period)
  // ════════════════════════════════════════════════════════════════════════

  const retEarnings: number[] = [];
  let cumNI = 0;
  for (let i = 0; i < proj.length; i++) { cumNI += monthlyNetIncome[i]; retEarnings.push(cumNI); }

  const bsRows: Row[] = [
    ["DYRT LABS, INC."],
    ["Pro Forma Balance Sheet"],
    [],
    headers,
    [],
    ["ASSETS"],
    ["Current Assets"],
    annualEndBalance("Cash & Cash Equivalents", (_, i) => cumCash[i], true),
    annualEndBalance("Total Current Assets", (_, i) => cumCash[i]),
    blankRow(),
    ["Non-Current Assets"],
    annualEndBalance("Property, Plant & Equipment", () => result.totalCapex, true),
    annualEndBalance("Less: Accumulated Depreciation", (_, i) => -(i + 1) * monthlyDep, true),
    annualEndBalance("Net PP&E", (_, i) => result.totalCapex - (i + 1) * monthlyDep, true),
    annualEndBalance("Total Non-Current Assets", (_, i) => result.totalCapex - (i + 1) * monthlyDep),
    blankRow(),
    annualEndBalance("TOTAL ASSETS", (_, i) => cumCash[i] + result.totalCapex - (i + 1) * monthlyDep),
    blankRow(),
    blankRow(),
    ["LIABILITIES & EQUITY"],
    ["Liabilities"],
    annualEndBalance("Term Loan Payable", (_, i) => loanSchedule[i]?.balance ?? 0, true),
    annualEndBalance("Total Liabilities", (_, i) => loanSchedule[i]?.balance ?? 0),
    blankRow(),
    ["Stockholders' Equity"],
    annualEndBalance("Contributed Capital", () => equityInvested, true),
    annualEndBalance("Retained Earnings (Deficit)", (_, i) => retEarnings[i], true),
    annualEndBalance("Total Stockholders' Equity", (_, i) => equityInvested + retEarnings[i]),
    blankRow(),
    annualEndBalance("TOTAL LIABILITIES & EQUITY", (_, i) => {
      const liab = loanSchedule[i]?.balance ?? 0;
      return liab + equityInvested + retEarnings[i];
    }),
  ];

  const wsBS = XLSX.utils.aoa_to_sheet(bsRows);
  setCols(wsBS, 38, numYears);
  XLSX.utils.book_append_sheet(wb, wsBS, "Balance Sheet");

  // ════════════════════════════════════════════════════════════════════════
  // SHEET 5: MONTHLY DETAIL (for due diligence)
  // ════════════════════════════════════════════════════════════════════════
  const mHeaders = ["", ...proj.map((p) => `Mo ${p.month}`)];
  const mRows: Row[] = [
    ["MONTHLY OPERATING DETAIL"],
    [],
    mHeaders,
    [],
    ["Operational Metrics"],
    ["   Utilization", ...proj.map((p) => `${(p.utilization * 100).toFixed(1)}%`)],
    ["   Daily Tons", ...proj.map((p) => Math.round(p.dailyTonsIn * 10) / 10)],
    ["   Monthly Tons", ...proj.map((p) => Math.round(p.monthlyTonsIn))],
    [],
    ["Revenue"],
    ["   Tipping Fees", ...proj.map((p) => Math.round(p.tippingRevenue))],
    ["   Compost Sales", ...proj.map((p) => Math.round(p.compostRevenue))],
    ["   Total Revenue", ...proj.map((p) => Math.round(p.totalRevenue))],
    [],
    ["Variable Costs"],
    ["   Sawdust", ...proj.map((p) => Math.round(p.sawdustCost))],
    ["   Digester Disposal", ...proj.map((p) => Math.round(p.digesterDisposalCost))],
    ["   Digester Hauling", ...proj.map((p) => Math.round(p.digesterHaulingCost))],
    ["   Compost Shipping", ...proj.map((p) => Math.round(p.shippingCost))],
    [],
    ["Fixed Costs"],
    ["   Labor", ...proj.map((p) => Math.round(p.laborCost))],
    ["   Rent", ...proj.map((p) => Math.round(p.facilityCost))],
    ["   Fleet", ...proj.map((p) => Math.round(p.truckCost))],
    ["   Other", ...proj.map((p) => Math.round(p.otherOpex))],
    [],
    ["   Total OpEx", ...proj.map((p) => Math.round(p.totalOpex))],
    ["   Debt Service", ...proj.map((p) => Math.round(p.debtService))],
    [],
    ["Net Profit (Loss)", ...proj.map((p) => Math.round(p.netProfit))],
    ["Cumulative P&L", ...proj.map((p) => Math.round(p.cumulativeProfit))],
    [],
    ["Loan Balance", ...proj.map((_, i) => Math.round(loanSchedule[i]?.balance ?? 0))],
    ["Cash Balance", ...cumCash.map((c) => Math.round(c))],
  ];

  const wsMo = XLSX.utils.aoa_to_sheet(mRows);
  setCols(wsMo, 22, proj.length, 12);
  XLSX.utils.book_append_sheet(wb, wsMo, "Monthly Detail");

  // ── Write ─────────────────────────────────────────────────────────────
  XLSX.writeFile(wb, `Dyrt_Labs_ProForma_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
