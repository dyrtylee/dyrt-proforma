import { FacilityInputs } from "./types";

export const defaultInputs: FacilityInputs = {
  // Equipment CAPEX
  numComposters: 18,
  composterCost: 65000,
  composterCapacityLbs: 2500, // lbs raw food waste per composter per day
  dewatererCost: 150000,
  dewateringReduction: 0.80, // 80% weight reduction
  digesterCost: 200000,
  conveyorCost: 65000,
  depackagerCost: 175000,
  trommelCost: 35000,
  carbonDosingCost: 20000,
  curingSystemCost: 15000,
  leachateManagementCost: 25000,

  // Facility CAPEX
  facilityBuildoutCost: 235000,
  numTrucks: 4,
  truckCost: 95000,
  skidSteerForkliftCost: 55000,
  miscEquipmentCost: 43000,

  // Carbon / Sawdust
  cnRatio: 60, // target C:N ratio
  foodWasteCN: 15, // food waste C:N
  sawdustCN: 400, // sawdust C:N
  sawdustCostPer100CY: 1800,
  sawdustDensityLbsPerCY: 350, // ~350 lbs per cubic yard of sawdust

  // Operating Costs (monthly)
  facilityLease: 15000,
  numEmployees: 10,
  hourlyRate: 30, // $/hr
  payrollTaxRate: 0.20,
  machineCogsPerUnit: 1200,
  utilities: 3500,
  insurancePermits: 2000,
  equipmentMaintenance: 2300,
  suppliesConsumables: 4500,
  adminITDisposal: 1800,
  truckFuelPerMonth: 600,
  truckMaintenancePerMonth: 500,
  truckInsurancePerMonth: 648, // $7,778/yr per BHHC policy

  // Revenue
  tippingFeePerLb: 0.10,
  compostPricePerCY: 35,
  compostShrinkage: 0.40, // 40% volume loss during composting
  compostDensityLbsPerCY: 800, // finished compost density

  // Shipping
  trailerCapacityTons: 25, // 53' trailer capacity
  shippingCostPerLoad: 800,

  // Labor escalation
  laborEscalatorRate: 0.03, // 3% annual raise

  // Ramp & Growth
  rampMonths: 12,
  startingTonnage: 5, // tons/day starting
  annualTonnageGrowth: 0.35, // 35% annual growth in tonnage
  startingUtilization: 0.15, // legacy

  // Financing
  loanInterestRate: 0.085,
  loanTermYears: 7,
  equityPercentage: 1.0, // 100% equity (no debt) by default

  // Time horizon
  projectionMonths: 60,
};

export interface InputConfig {
  key: keyof FacilityInputs;
  label: string;
  min: number;
  max: number;
  step: number;
  format: "currency" | "percent" | "number" | "currency-large";
  group: string;
}

export const inputConfigs: InputConfig[] = [
  // Equipment CAPEX
  { key: "numComposters", label: "Number of Composters", min: 1, max: 100, step: 1, format: "number", group: "Equipment CAPEX" },
  { key: "composterCost", label: "Cost per Composter", min: 30000, max: 150000, step: 5000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "composterCapacityLbs", label: "Composter Capacity (lbs/day)", min: 500, max: 5000, step: 100, format: "number", group: "Equipment CAPEX" },
  { key: "dewatererCost", label: "Dewaterer Cost", min: 50000, max: 500000, step: 10000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "dewateringReduction", label: "Dewatering Weight Reduction", min: 0.50, max: 0.95, step: 0.05, format: "percent", group: "Equipment CAPEX" },
  { key: "digesterCost", label: "Digester Cost", min: 50000, max: 1000000, step: 25000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "conveyorCost", label: "Wet Conveyor System", min: 20000, max: 200000, step: 5000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "depackagerCost", label: "Depackager", min: 50000, max: 500000, step: 10000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "trommelCost", label: "Trommel Screen", min: 10000, max: 100000, step: 5000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "carbonDosingCost", label: "Carbon Dosing System", min: 5000, max: 100000, step: 5000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "curingSystemCost", label: "Curing System", min: 5000, max: 100000, step: 5000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "leachateManagementCost", label: "Leachate Management", min: 5000, max: 100000, step: 5000, format: "currency-large", group: "Equipment CAPEX" },

  // Facility CAPEX
  { key: "facilityBuildoutCost", label: "Facility Buildout", min: 50000, max: 1000000, step: 25000, format: "currency-large", group: "Facility CAPEX" },
  { key: "numTrucks", label: "Number of Trucks", min: 1, max: 10, step: 1, format: "number", group: "Facility CAPEX" },
  { key: "truckCost", label: "Cost per Truck", min: 50000, max: 200000, step: 5000, format: "currency-large", group: "Facility CAPEX" },
  { key: "skidSteerForkliftCost", label: "Skid Steer + Forklift", min: 20000, max: 150000, step: 5000, format: "currency-large", group: "Facility CAPEX" },
  { key: "miscEquipmentCost", label: "Misc Equipment (Scale, IT, etc)", min: 10000, max: 200000, step: 5000, format: "currency-large", group: "Facility CAPEX" },

  // Carbon / Sawdust
  { key: "cnRatio", label: "Target C:N Ratio", min: 20, max: 80, step: 1, format: "number", group: "Carbon & Amendments" },
  { key: "foodWasteCN", label: "Food Waste C:N Ratio", min: 10, max: 25, step: 1, format: "number", group: "Carbon & Amendments" },
  { key: "sawdustCN", label: "Sawdust C:N Ratio", min: 100, max: 600, step: 25, format: "number", group: "Carbon & Amendments" },
  { key: "sawdustCostPer100CY", label: "Sawdust Cost (per 100 CY)", min: 500, max: 5000, step: 100, format: "currency", group: "Carbon & Amendments" },
  { key: "sawdustDensityLbsPerCY", label: "Sawdust Density (lbs/CY)", min: 200, max: 600, step: 25, format: "number", group: "Carbon & Amendments" },

  // Operating Costs
  { key: "facilityLease", label: "Monthly Facility Lease", min: 5000, max: 60000, step: 1000, format: "currency", group: "Monthly Operating Costs" },
  { key: "numEmployees", label: "Number of Employees", min: 1, max: 30, step: 1, format: "number", group: "Monthly Operating Costs" },
  { key: "hourlyRate", label: "Hourly Rate ($/hr)", min: 15, max: 60, step: 1, format: "currency", group: "Monthly Operating Costs" },
  { key: "payrollTaxRate", label: "Payroll Tax Rate", min: 0.10, max: 0.35, step: 0.01, format: "percent", group: "Monthly Operating Costs" },
  { key: "laborEscalatorRate", label: "Annual Labor Escalator", min: 0, max: 0.10, step: 0.005, format: "percent", group: "Monthly Operating Costs" },
  { key: "machineCogsPerUnit", label: "Machine COGS (per unit/mo)", min: 500, max: 3000, step: 100, format: "currency", group: "Monthly Operating Costs" },
  { key: "utilities", label: "Utilities", min: 1000, max: 15000, step: 500, format: "currency", group: "Monthly Operating Costs" },
  { key: "insurancePermits", label: "Insurance & Permits", min: 500, max: 10000, step: 250, format: "currency", group: "Monthly Operating Costs" },
  { key: "equipmentMaintenance", label: "Equipment Maintenance", min: 500, max: 10000, step: 250, format: "currency", group: "Monthly Operating Costs" },
  { key: "suppliesConsumables", label: "Supplies & Consumables", min: 1000, max: 15000, step: 500, format: "currency", group: "Monthly Operating Costs" },
  { key: "adminITDisposal", label: "Admin / IT / Disposal", min: 500, max: 10000, step: 250, format: "currency", group: "Monthly Operating Costs" },
  { key: "truckFuelPerMonth", label: "Truck Fuel (per truck/mo)", min: 200, max: 2000, step: 50, format: "currency", group: "Monthly Operating Costs" },
  { key: "truckMaintenancePerMonth", label: "Truck Maint (per truck/mo)", min: 200, max: 3000, step: 100, format: "currency", group: "Monthly Operating Costs" },
  { key: "truckInsurancePerMonth", label: "Truck Ins (per truck/mo)", min: 100, max: 1200, step: 25, format: "currency", group: "Monthly Operating Costs" },

  // Revenue
  { key: "tippingFeePerLb", label: "Tipping Fee (per lb)", min: 0.03, max: 0.25, step: 0.005, format: "currency", group: "Revenue" },
  { key: "compostPricePerCY", label: "Compost Sale Price (per CY)", min: 10, max: 80, step: 5, format: "currency", group: "Revenue" },
  { key: "compostShrinkage", label: "Compost Volume Shrinkage", min: 0.20, max: 0.60, step: 0.05, format: "percent", group: "Revenue" },
  { key: "compostDensityLbsPerCY", label: "Finished Compost (lbs/CY)", min: 500, max: 1200, step: 50, format: "number", group: "Revenue" },

  // Shipping
  { key: "trailerCapacityTons", label: "53' Trailer Capacity (tons)", min: 15, max: 30, step: 1, format: "number", group: "Shipping" },
  { key: "shippingCostPerLoad", label: "Shipping Cost per Load", min: 500, max: 5000, step: 100, format: "currency", group: "Shipping" },

  // Ramp
  { key: "startingTonnage", label: "Starting Tonnage (tons/day)", min: 1, max: 50, step: 1, format: "number", group: "Ramp & Financing" },
  { key: "annualTonnageGrowth", label: "Annual Tonnage Growth", min: 0.05, max: 1.00, step: 0.05, format: "percent", group: "Ramp & Financing" },
  { key: "loanInterestRate", label: "Loan Interest Rate", min: 0.04, max: 0.15, step: 0.005, format: "percent", group: "Ramp & Financing" },
  { key: "loanTermYears", label: "Loan Term (years)", min: 3, max: 20, step: 1, format: "number", group: "Ramp & Financing" },
  { key: "equityPercentage", label: "Equity % of CAPEX", min: 0, max: 1, step: 0.05, format: "percent", group: "Ramp & Financing" },
  { key: "projectionMonths", label: "Projection Period (months)", min: 12, max: 120, step: 6, format: "number", group: "Ramp & Financing" },
];

export const groupOrder = [
  "Revenue",
  "Monthly Operating Costs",
  "Equipment CAPEX",
  "Facility CAPEX",
  "Carbon & Amendments",
  "Shipping",
  "Ramp & Financing",
];
