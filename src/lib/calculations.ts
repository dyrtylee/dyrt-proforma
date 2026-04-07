import { FacilityInputs, MonthlyProjection, BreakEvenResult, ProFormaResult } from "./types";

/**
 * Calculate the sawdust-to-food-waste ratio needed to achieve the target C:N ratio.
 * Uses the Pearson square method for mixing two materials.
 *
 * Formula: ratio = (targetCN - foodCN) / (sawdustCN - targetCN)
 * This gives lbs of sawdust per lb of food waste.
 */
function calcSawdustRatio(targetCN: number, foodCN: number, sawdustCN: number): number {
  return (targetCN - foodCN) / (sawdustCN - targetCN);
}

/**
 * Calculate monthly loan payment using standard amortization formula.
 */
function calcMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0 || annualRate <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
}

/**
 * Calculate utilization curve for a given month (S-curve ramp).
 */
function calcUtilization(month: number, rampMonths: number, startUtil: number): number {
  if (month >= rampMonths) return 1.0;
  // Linear ramp from startUtil to 1.0 over rampMonths
  const progress = month / rampMonths;
  return startUtil + (1.0 - startUtil) * progress;
}

export function calculateProForma(inputs: FacilityInputs): ProFormaResult {
  // --- CAPEX ---
  const compostersTotal = inputs.numComposters * inputs.composterCost;
  const trucksTotal = inputs.numTrucks * inputs.truckCost;

  const capexBreakdown: Record<string, number> = {
    "Composters": compostersTotal,
    "Dewaterer": inputs.dewatererCost,
    "Wet Conveyor": inputs.conveyorCost,
    "Depackager": inputs.depackagerCost,
    "Trommel Screen": inputs.trommelCost,
    "Carbon Dosing": inputs.carbonDosingCost,
    "Curing System": inputs.curingSystemCost,
    "Leachate Mgmt": inputs.leachateManagementCost,
    "Facility Buildout": inputs.facilityBuildoutCost,
    "Collection Fleet": trucksTotal,
    "Skid Steer/Forklift": inputs.skidSteerForkliftCost,
    "Misc Equipment": inputs.miscEquipmentCost,
  };

  const totalCapex = Object.values(capexBreakdown).reduce((sum, v) => sum + v, 0);

  // --- CAPACITY ---
  // Equipment capacity from composters, but capped by user-set maxTonsPerDay
  const equipmentCapacityLbs = inputs.numComposters * inputs.composterCapacityLbs;
  const equipmentCapacityTons = equipmentCapacityLbs / 2000;
  const maxDailyCapacityTons = Math.min(equipmentCapacityTons, inputs.maxTonsPerDay);
  const maxDailyCapacityLbs = maxDailyCapacityTons * 2000;

  // --- SAWDUST RATIO ---
  const sawdustRatio = calcSawdustRatio(inputs.cnRatio, inputs.foodWasteCN, inputs.sawdustCN);
  const sawdustCostPerLb = inputs.sawdustCostPer100CY / (100 * inputs.sawdustDensityLbsPerCY);

  // --- DEBT SERVICE ---
  const debtPrincipal = totalCapex * (1 - inputs.equityPercentage);
  const monthlyDebtService = calcMonthlyPayment(debtPrincipal, inputs.loanInterestRate, inputs.loanTermYears);

  // --- FIXED MONTHLY COSTS ---
  // FTE: 40 hrs/week * 52 weeks / 12 months = 173.33 hrs/month
  const monthlyHoursPerEmployee = (40 * 52) / 12;
  const baseLaborCost = inputs.numEmployees * inputs.hourlyRate * monthlyHoursPerEmployee;
  const totalLabor = baseLaborCost * (1 + inputs.payrollTaxRate);
  const machineCogs = inputs.numComposters * inputs.machineCogsPerUnit;
  const truckOpex = inputs.numTrucks * (
    inputs.truckFuelPerMonth +
    inputs.truckMaintenancePerMonth +
    inputs.truckInsurancePerMonth
  );
  const otherFixed =
    inputs.utilities +
    inputs.insurancePermits +
    inputs.equipmentMaintenance +
    inputs.suppliesConsumables +
    inputs.adminITDisposal;

  const monthlyFixedCosts = totalLabor + machineCogs + inputs.facilityLease + truckOpex + otherFixed;

  // --- PROJECTIONS ---
  const projections: MonthlyProjection[] = [];
  let cumulativeProfit = -totalCapex * inputs.equityPercentage; // equity invested upfront

  for (let m = 1; m <= inputs.projectionMonths; m++) {
    // Tonnage grows from startingTonnage at annualTonnageGrowth rate, compounded monthly.
    // Capped at max composter capacity (equipment ceiling).
    const monthlyGrowthRate = Math.pow(1 + inputs.annualTonnageGrowth, 1 / 12) - 1;
    const demandTons = inputs.startingTonnage * Math.pow(1 + monthlyGrowthRate, m - 1);
    const dailyTonsIn = Math.min(demandTons, maxDailyCapacityTons);
    const utilization = dailyTonsIn / maxDailyCapacityTons;
    const dailyLbsIn = dailyTonsIn * 2000;
    const operatingDays = 26; // ~6 days/week
    const monthlyLbsIn = dailyLbsIn * operatingDays;
    const monthlyTonsIn = monthlyLbsIn / 2000;

    // Labor escalation: compound annually
    const yearsElapsed = (m - 1) / 12;
    const laborMultiplier = Math.pow(1 + inputs.laborEscalatorRate, yearsElapsed);
    const escalatedLabor = totalLabor * laborMultiplier;

    // Dewatering
    const dewateredLbs = monthlyLbsIn * (1 - inputs.dewateringReduction);
    const sludgeToDigesterLbs = monthlyLbsIn * inputs.dewateringReduction;

    // Sawdust needed (applied to dewatered material going to composters)
    const sawdustNeededLbs = dewateredLbs * sawdustRatio;
    const sawdustNeededCY = sawdustNeededLbs / inputs.sawdustDensityLbsPerCY;
    const sawdustCost = sawdustNeededLbs * sawdustCostPerLb;

    // Compost produced (dewatered food + sawdust, minus shrinkage)
    const rawCompostLbs = (dewateredLbs + sawdustNeededLbs) * (1 - inputs.compostShrinkage);
    const compostCY = rawCompostLbs / inputs.compostDensityLbsPerCY;

    // Digester liquid disposal (sludge from dewaterer)
    const sludgeGallons = sludgeToDigesterLbs / inputs.liquidDensityLbsPerGallon;
    const digesterDisposalCost = sludgeGallons * inputs.digesterDisposalPerGallon;
    const digesterTruckloads = Math.ceil(sludgeGallons / inputs.digesterTruckCapacityGallons);
    const digesterHaulingCost = digesterTruckloads * inputs.digesterTruckloadCost;

    // Shipping (compost out)
    const compostTons = rawCompostLbs / 2000;
    const truckloadsCompost = Math.ceil(compostTons / inputs.trailerCapacityTons);
    const shippingCost = truckloadsCompost * inputs.shippingCostPerLoad;

    // Revenue
    const tippingRevenue = monthlyLbsIn * inputs.tippingFeePerLb;
    const compostRevenue = compostCY * inputs.compostPricePerCY;
    const totalRevenue = tippingRevenue + compostRevenue;

    // Costs (with escalated labor)
    const monthFixedCosts = escalatedLabor + machineCogs + inputs.facilityLease + truckOpex + otherFixed;
    const totalOpex = monthFixedCosts + sawdustCost + shippingCost + digesterDisposalCost + digesterHaulingCost;

    // Profitability
    const grossProfit = totalRevenue - sawdustCost - shippingCost - machineCogs;
    const grossMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0;
    const netProfit = totalRevenue - totalOpex - monthlyDebtService;
    const netMargin = totalRevenue > 0 ? netProfit / totalRevenue : 0;
    cumulativeProfit += netProfit;

    projections.push({
      month: m,
      utilization,
      dailyTonsIn,
      monthlyTonsIn,
      monthlyLbsIn,
      dewateredLbs,
      sludgeToDigesterLbs,
      sawdustNeededLbs,
      sawdustNeededCY,
      compostProducedLbs: rawCompostLbs,
      compostProducedCY: compostCY,
      truckloadsCompost,
      sludgeGallons,
      digesterDisposalCost,
      digesterHaulingCost,
      digesterTruckloads,
      tippingRevenue,
      compostRevenue,
      shippingCost,
      totalRevenue,
      laborCost: escalatedLabor,
      machineCogs,
      sawdustCost,
      facilityCost: inputs.facilityLease,
      truckCost: truckOpex,
      otherOpex: otherFixed,
      totalOpex,
      debtService: monthlyDebtService,
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
      cumulativeProfit,
    });
  }

  // --- BREAK-EVEN ---
  // Variable cost per ton = (sawdust + shipping) at full utilization, per ton
  const fullMonthlyLbs = maxDailyCapacityLbs * 26;
  const fullDewateredLbs = fullMonthlyLbs * (1 - inputs.dewateringReduction);
  const fullSawdustLbs = fullDewateredLbs * sawdustRatio;
  const fullSawdustCost = fullSawdustLbs * sawdustCostPerLb;
  const fullCompostLbs = (fullDewateredLbs + fullSawdustLbs) * (1 - inputs.compostShrinkage);
  const fullCompostTons = fullCompostLbs / 2000;
  const fullTruckloads = Math.ceil(fullCompostTons / inputs.trailerCapacityTons);
  const fullShippingCost = fullTruckloads * inputs.shippingCostPerLoad;
  const fullMonthlyTons = fullMonthlyLbs / 2000;

  // Digester disposal at full capacity
  const fullSludgeLbs = fullMonthlyLbs * inputs.dewateringReduction;
  const fullSludgeGallons = fullSludgeLbs / inputs.liquidDensityLbsPerGallon;
  const fullDigesterDisposal = fullSludgeGallons * inputs.digesterDisposalPerGallon;
  const fullDigesterTruckloads = Math.ceil(fullSludgeGallons / inputs.digesterTruckCapacityGallons);
  const fullDigesterHauling = fullDigesterTruckloads * inputs.digesterTruckloadCost;

  const variableCostPerTon = (fullSawdustCost + fullShippingCost + fullDigesterDisposal + fullDigesterHauling) / fullMonthlyTons;
  const fullCompostCY = fullCompostLbs / inputs.compostDensityLbsPerCY;
  const revenuePerTon = (fullMonthlyLbs * inputs.tippingFeePerLb + fullCompostCY * inputs.compostPricePerCY) / fullMonthlyTons;
  const contributionMarginPerTon = revenuePerTon - variableCostPerTon;

  const fixedCosts = monthlyFixedCosts + monthlyDebtService - (fullSawdustCost + fullShippingCost);
  // Recalculate: fixed = totalLabor + machineCogs + lease + truckOpex + otherFixed + debtService
  const trueFixedCosts = totalLabor + machineCogs + inputs.facilityLease + truckOpex + otherFixed + monthlyDebtService;

  // Break-even tons/month = fixedCosts / contributionMarginPerTon
  // Then convert to tons/day
  const breakEvenTonsPerMonth = contributionMarginPerTon > 0 ? trueFixedCosts / contributionMarginPerTon : Infinity;
  const breakEvenTonsPerDay = breakEvenTonsPerMonth / 26;
  const breakEvenUtilization = breakEvenTonsPerDay / maxDailyCapacityTons;

  // Find break-even month
  const breakEvenMonth = projections.find((p) => p.netProfit >= 0)?.month ?? null;

  // Steady-state margin (last month at full utilization)
  const lastFullMonth = projections.find((p) => p.utilization >= 1.0);
  const steadyStateMargin = lastFullMonth?.netMargin ?? 0;

  // Payback period (when cumulative profit turns positive)
  const paybackMonth = projections.find((p) => p.cumulativeProfit >= 0)?.month ?? null;

  return {
    totalCapex,
    capexBreakdown,
    maxDailyCapacityTons,
    maxDailyCapacityLbs,
    monthlyProjections: projections,
    breakEven: {
      breakEvenTonsPerDay,
      breakEvenMonth,
      breakEvenUtilization,
      monthlyFixedCosts: trueFixedCosts,
      variableCostPerTon,
      revenuePerTon,
      contributionMarginPerTon,
    },
    steadyStateMargin,
    paybackMonths: paybackMonth,
  };
}
