export interface FacilityInputs {
  // Equipment CAPEX
  numComposters: number;
  composterCost: number;
  composterCapacityLbs: number; // lbs of raw food waste per composter per day
  dewatererCost: number;
  dewateringReduction: number; // percentage (0-1), e.g. 0.80 = 80% weight reduction
  digesterCost: number;
  conveyorCost: number;
  depackagerCost: number;
  trommelCost: number;
  carbonDosingCost: number;
  curingSystemCost: number;
  leachateManagementCost: number;

  // Facility CAPEX
  facilityBuildoutCost: number;
  numTrucks: number;
  truckCost: number;
  skidSteerForkliftCost: number;
  miscEquipmentCost: number;

  // Carbon / Sawdust
  cnRatio: number; // target C:N ratio
  foodWasteCN: number; // C:N ratio of food waste
  sawdustCN: number; // C:N ratio of sawdust
  sawdustCostPer100CY: number; // cost per 100 cubic yards
  sawdustDensityLbsPerCY: number; // lbs per cubic yard of sawdust

  // Operating Costs (monthly)
  facilityLease: number;
  laborFloorSupervisor: number;
  laborDepackFeeders: number;
  laborQCSorting: number;
  laborOverheadMgmt: number;
  laborTruckDrivers: number;
  laborOvertime: number;
  payrollTaxRate: number; // percentage (0-1)
  machineCogsPerUnit: number; // monthly per composter
  utilities: number;
  insurancePermits: number;
  equipmentMaintenance: number;
  suppliesConsumables: number;
  adminITDisposal: number;
  truckFuelPerMonth: number;
  truckMaintenancePerMonth: number;
  truckInsurancePerMonth: number;

  // Revenue
  tippingFeePerLb: number;
  compostPricePerCY: number;
  compostShrinkage: number; // percentage lost during composting (0-1)
  compostDensityLbsPerCY: number;

  // Shipping
  trailerCapacityTons: number;
  shippingCostPerLoad: number;

  // Ramp
  rampMonths: number; // months to reach full capacity
  startingUtilization: number; // starting % (0-1)

  // Financing
  loanInterestRate: number; // annual (0-1)
  loanTermYears: number;
  equityPercentage: number; // % of CAPEX funded by equity (0-1)

  // Time horizon
  projectionMonths: number;
}

export interface MonthlyProjection {
  month: number;
  utilization: number;
  dailyTonsIn: number;
  monthlyTonsIn: number;
  monthlyLbsIn: number;
  dewateredLbs: number;
  sludgeToDigesterLbs: number;
  sawdustNeededLbs: number;
  sawdustNeededCY: number;
  compostProducedLbs: number;
  compostProducedCY: number;
  truckloadsCompost: number;

  // Revenue
  tippingRevenue: number;
  compostRevenue: number;
  shippingCost: number;
  totalRevenue: number;

  // Operating Costs
  laborCost: number;
  machineCogs: number;
  sawdustCost: number;
  facilityCost: number;
  truckCost: number;
  otherOpex: number;
  totalOpex: number;

  // Debt Service
  debtService: number;

  // Profitability
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  cumulativeProfit: number;
}

export interface BreakEvenResult {
  breakEvenTonsPerDay: number;
  breakEvenMonth: number | null;
  breakEvenUtilization: number;
  monthlyFixedCosts: number;
  variableCostPerTon: number;
  revenuePerTon: number;
  contributionMarginPerTon: number;
}

export interface ProFormaResult {
  totalCapex: number;
  capexBreakdown: Record<string, number>;
  maxDailyCapacityTons: number;
  maxDailyCapacityLbs: number;
  monthlyProjections: MonthlyProjection[];
  breakEven: BreakEvenResult;
  steadyStateMargin: number;
  paybackMonths: number | null;
}
