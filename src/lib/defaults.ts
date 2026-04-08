import { FacilityInputs } from "./types";

export const defaultInputs: FacilityInputs = {
  // Equipment CAPEX
  numComposters: 80, // auto-calculated: ceil(maxTonsPerDay * 2000 / composterCapacityLbs)
  composterCost: 65000,
  composterCapacityLbs: 2500, // lbs raw food waste per composter per day
  dewatererCost: 150000,
  dewateringReduction: 0.80, // 80% weight reduction
  conveyorCost: 65000,
  depackagerCost: 175000,
  trommelCost: 35000,
  carbonDosingCost: 20000,
  curingSystemCost: 15000,
  leachateManagementCost: 25000,

  // Bins
  binCost: 57,
  pctBinCustomers: 0.47, // 47% bin, rest pallet-only (from Dyrt DB)
  avgBinsPerLocation: 9, // avg bins deployed per bin-customer
  binFactor: 2.3, // bins needed per deployed bin (transit + wash + buffer)
  avgTonsPerCustomer: 0.57, // ~1,140 lbs/day per customer avg

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
  facilityLease: 50000,
  numEmployees: 10,
  hourlyRate: 30, // $/hr
  payrollTaxRate: 0.20,
  utilities: 3500,
  insurancePermits: 2000,
  equipmentMaintenance: 2300,
  suppliesConsumables: 4500,
  adminITDisposal: 1800,
  truckFuelPerMonth: 600,
  truckMaintenancePerMonth: 500,
  truckInsurancePerMonth: 648, // $7,778/yr per BHHC policy

  // Digester Liquid Disposal
  digesterDisposalPerGallon: 0.01,
  digesterTruckloadCost: 800,
  digesterTruckCapacityGallons: 5000, // ~5,000 gallon tanker
  liquidDensityLbsPerGallon: 8.34, // water-like density

  // Revenue
  tippingFeePerLb: 0.10,
  compostPricePerCY: 10,
  compostShrinkage: 0.40, // 40% volume loss during composting
  compostDensityLbsPerCY: 800, // finished compost density

  // Shipping
  trailerCapacityTons: 25, // 53' trailer capacity
  shippingCostPerLoad: 800,

  // Labor escalation
  laborEscalatorRate: 0.03, // 3% annual raise

  // Ramp & Growth
  rampMonths: 12,
  startingTonnage: 15, // tons/day starting
  annualTonnageGrowth: 3.00, // 300% annual growth in tonnage
  maxTonsPerDay: 100, // hard cap
  startingUtilization: 0.15, // legacy

  // Financing
  loanInterestRate: 0.085,
  loanTermYears: 7,
  equityPercentage: 0.20, // 20% equity, 80% debt

  // Time horizon
  projectionMonths: 60,
};

export interface InputConfig {
  key: keyof FacilityInputs;
  label: string;
  tip: string;
  min: number;
  max: number;
  step: number;
  format: "currency" | "percent" | "number" | "currency-large";
  group: string;
}

export const inputConfigs: InputConfig[] = [
  // Equipment CAPEX
  { key: "numComposters", label: "Composters Required", tip: "Auto-calculated from Max Tons per Day and composter capacity. Each composter handles 2,500 lbs/day of raw food waste.", min: 1, max: 200, step: 1, format: "number", group: "Equipment CAPEX" },
  { key: "composterCost", label: "Cost per Composter", tip: "Purchase price per composting unit. Contract manufacturing ~$85K, in-house ~$60K.", min: 30000, max: 150000, step: 5000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "composterCapacityLbs", label: "Composter Capacity (lbs/day)", tip: "Raw food waste each composter can process per day before dewatering.", min: 500, max: 5000, step: 100, format: "number", group: "Equipment CAPEX" },
  { key: "dewatererCost", label: "Dewaterer Cost", tip: "Mechanical press that removes water from food waste before composting.", min: 50000, max: 500000, step: 10000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "dewateringReduction", label: "Dewatering Weight Reduction", tip: "Percentage of food waste weight removed as liquid. 80% means 100 lbs in → 20 lbs to composters + 80 lbs liquid to digester.", min: 0.50, max: 0.95, step: 0.05, format: "percent", group: "Equipment CAPEX" },
  { key: "conveyorCost", label: "Wet Conveyor System", tip: "Moves dewatered material from the dewaterer to the composters.", min: 20000, max: 200000, step: 5000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "depackagerCost", label: "Depackager", tip: "Removes packaging from food waste before it enters the processing line.", min: 50000, max: 500000, step: 10000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "trommelCost", label: "Trommel Screen", tip: "Rotating drum screen that separates finished compost by particle size.", min: 10000, max: 100000, step: 5000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "carbonDosingCost", label: "Carbon Dosing System", tip: "Automated system for mixing sawdust/carbon into the composting feedstock.", min: 5000, max: 100000, step: 5000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "curingSystemCost", label: "Curing System", tip: "Windrow or bay system where compost matures for 4-8 weeks after active composting.", min: 5000, max: 100000, step: 5000, format: "currency-large", group: "Equipment CAPEX" },
  { key: "leachateManagementCost", label: "Leachate Management", tip: "Collection and treatment system for liquid runoff from the composting process.", min: 5000, max: 100000, step: 5000, format: "currency-large", group: "Equipment CAPEX" },

  // Bins & Customers
  { key: "binCost", label: "Cost per Bin", tip: "Purchase price per 35/65-gallon collection bin. Blended avg from Dyrt operations.", min: 20, max: 100, step: 1, format: "currency", group: "Bins & Customers" },
  { key: "pctBinCustomers", label: "% Bin Customers", tip: "47% of Dyrt customers use bins (hospitality, venues). Rest are pallet-only (produce, wholesale).", min: 0.10, max: 0.80, step: 0.01, format: "percent", group: "Bins & Customers" },
  { key: "avgBinsPerLocation", label: "Avg Bins per Location", tip: "Average bins deployed at each bin-customer. Dyrt DB shows ~9 bins/visit across bin accounts.", min: 2, max: 30, step: 1, format: "number", group: "Bins & Customers" },
  { key: "binFactor", label: "Bin Multiplier", tip: "Total bins needed per deployed bin — covers bins at customer, in transit, being washed, and buffer. 2.3x from operations data.", min: 1.5, max: 4.0, step: 0.1, format: "number", group: "Bins & Customers" },
  { key: "avgTonsPerCustomer", label: "Avg Tons/Day per Customer", tip: "Average daily food waste per customer location. Derived from Dyrt DB: ~45 customers producing ~25.5 tons/day.", min: 0.2, max: 2.0, step: 0.05, format: "number", group: "Bins & Customers" },

  // Facility CAPEX
  { key: "facilityBuildoutCost", label: "Facility Buildout", tip: "Deposit, tenant improvements, dock upgrades, and office buildout for the facility.", min: 50000, max: 1000000, step: 25000, format: "currency-large", group: "Facility CAPEX" },
  { key: "numTrucks", label: "Number of Trucks", tip: "Collection vehicles for picking up food waste from customer locations.", min: 1, max: 10, step: 1, format: "number", group: "Facility CAPEX" },
  { key: "truckCost", label: "Cost per Truck", tip: "Purchase price per collection truck.", min: 50000, max: 200000, step: 5000, format: "currency-large", group: "Facility CAPEX" },
  { key: "skidSteerForkliftCost", label: "Skid Steer + Forklift", tip: "Material handling equipment for moving feedstock and finished compost.", min: 20000, max: 150000, step: 5000, format: "currency-large", group: "Facility CAPEX" },
  { key: "miscEquipmentCost", label: "Misc Equipment (Scale, IT, etc)", tip: "Scales, RFID readers, kiosks, networking, tools, and other facility equipment.", min: 10000, max: 200000, step: 5000, format: "currency-large", group: "Facility CAPEX" },

  // Carbon / Sawdust
  { key: "cnRatio", label: "Target C:N Ratio", tip: "Carbon-to-nitrogen ratio for the composting mix. 60:1 is carbon-heavy for slower, stable decomposition.", min: 20, max: 80, step: 1, format: "number", group: "Carbon & Amendments" },
  { key: "foodWasteCN", label: "Food Waste C:N Ratio", tip: "Typical food waste is nitrogen-rich at ~15:1 C:N.", min: 10, max: 25, step: 1, format: "number", group: "Carbon & Amendments" },
  { key: "sawdustCN", label: "Sawdust C:N Ratio", tip: "Sawdust is carbon-rich at ~400:1 C:N. Used to balance the nitrogen in food waste.", min: 100, max: 600, step: 25, format: "number", group: "Carbon & Amendments" },
  { key: "sawdustCostPer100CY", label: "Sawdust Cost (per 100 CY)", tip: "Bulk purchase price for 100 cubic yards of sawdust delivered.", min: 500, max: 5000, step: 100, format: "currency", group: "Carbon & Amendments" },
  { key: "sawdustDensityLbsPerCY", label: "Sawdust Density (lbs/CY)", tip: "Weight per cubic yard of sawdust. Varies by moisture content.", min: 200, max: 600, step: 25, format: "number", group: "Carbon & Amendments" },

  // Operating Costs
  { key: "facilityLease", label: "Monthly Facility Lease", tip: "Monthly rent for the composting facility warehouse/yard.", min: 5000, max: 100000, step: 1000, format: "currency", group: "Monthly Operating Costs" },
  { key: "numEmployees", label: "Number of Employees", tip: "Full-time employees including drivers, sorters, operators, and supervisors.", min: 1, max: 30, step: 1, format: "number", group: "Monthly Operating Costs" },
  { key: "hourlyRate", label: "Hourly Rate ($/hr)", tip: "Blended average hourly rate across all employees.", min: 15, max: 60, step: 1, format: "currency", group: "Monthly Operating Costs" },
  { key: "payrollTaxRate", label: "Payroll Tax Rate", tip: "Employer payroll taxes, workers comp, and benefits as a % of base wages.", min: 0.10, max: 0.35, step: 0.01, format: "percent", group: "Monthly Operating Costs" },
  { key: "laborEscalatorRate", label: "Annual Labor Escalator", tip: "Annual wage increase applied to all employees. Compounds each year.", min: 0, max: 0.10, step: 0.005, format: "percent", group: "Monthly Operating Costs" },
  { key: "utilities", label: "Utilities", tip: "Electricity, water, gas for the facility.", min: 1000, max: 15000, step: 500, format: "currency", group: "Monthly Operating Costs" },
  { key: "insurancePermits", label: "Insurance & Permits", tip: "General liability, property insurance, and operating permits.", min: 500, max: 10000, step: 250, format: "currency", group: "Monthly Operating Costs" },
  { key: "equipmentMaintenance", label: "Equipment Maintenance", tip: "Ongoing maintenance and wear parts for composters and other equipment.", min: 500, max: 10000, step: 250, format: "currency", group: "Monthly Operating Costs" },
  { key: "suppliesConsumables", label: "Supplies & Consumables", tip: "Bags, bins, PPE, cleaning supplies, and other consumables.", min: 1000, max: 15000, step: 500, format: "currency", group: "Monthly Operating Costs" },
  { key: "adminITDisposal", label: "Admin / IT / Disposal", tip: "Back-office costs: software, accounting, waste disposal fees, and IT.", min: 500, max: 10000, step: 250, format: "currency", group: "Monthly Operating Costs" },
  { key: "truckFuelPerMonth", label: "Truck Fuel (per truck/mo)", tip: "Monthly fuel cost per collection truck.", min: 200, max: 2000, step: 50, format: "currency", group: "Monthly Operating Costs" },
  { key: "truckMaintenancePerMonth", label: "Truck Maint (per truck/mo)", tip: "Oil changes, tires, brakes, and repairs per truck per month.", min: 200, max: 3000, step: 100, format: "currency", group: "Monthly Operating Costs" },
  { key: "truckInsurancePerMonth", label: "Truck Ins (per truck/mo)", tip: "Commercial auto insurance per vehicle. Based on BHHC policy at $7,778/yr.", min: 100, max: 1200, step: 25, format: "currency", group: "Monthly Operating Costs" },

  // Digester Liquid Disposal
  { key: "digesterDisposalPerGallon", label: "Disposal Cost ($/gal)", tip: "Fee charged by the external digester facility per gallon of liquid accepted.", min: 0.005, max: 0.05, step: 0.005, format: "currency", group: "Digester Liquid Disposal" },
  { key: "digesterTruckloadCost", label: "Hauling Cost ($/truckload)", tip: "Cost per tanker truck to haul liquid from the dewaterer to the external digester.", min: 200, max: 2000, step: 50, format: "currency", group: "Digester Liquid Disposal" },
  { key: "digesterTruckCapacityGallons", label: "Tanker Capacity (gal)", tip: "Volume per tanker load. Standard tankers hold 4,000-6,000 gallons.", min: 2000, max: 10000, step: 500, format: "number", group: "Digester Liquid Disposal" },
  { key: "liquidDensityLbsPerGallon", label: "Liquid Density (lbs/gal)", tip: "Weight of the dewaterer liquid output. ~8.34 lbs/gal (similar to water).", min: 7.0, max: 10.0, step: 0.1, format: "number", group: "Digester Liquid Disposal" },

  // Revenue
  { key: "startingTonnage", label: "Starting Tonnage (tons/day)", tip: "Day-one food waste intake based on contracted customers at launch.", min: 1, max: 50, step: 1, format: "number", group: "Revenue" },
  { key: "annualTonnageGrowth", label: "Annual Tonnage Growth", tip: "Annual growth rate in food waste volume from new customer acquisition. Compounds monthly.", min: 0, max: 10.00, step: 0.05, format: "percent", group: "Revenue" },
  { key: "maxTonsPerDay", label: "Max Tons per Day", tip: "Hard ceiling on daily throughput — represents facility capacity constraint.", min: 10, max: 500, step: 5, format: "number", group: "Revenue" },
  { key: "tippingFeePerLb", label: "Tipping Fee (per lb)", tip: "Fee charged to customers per pound of food waste collected. Primary revenue driver.", min: 0.03, max: 0.25, step: 0.005, format: "currency", group: "Revenue" },
  { key: "compostPricePerCY", label: "Compost Sale Price (per CY)", tip: "Selling price per cubic yard of finished compost product.", min: 10, max: 80, step: 5, format: "currency", group: "Revenue" },
  { key: "compostShrinkage", label: "Compost Volume Shrinkage", tip: "Volume lost during composting from moisture evaporation and decomposition.", min: 0.20, max: 0.60, step: 0.05, format: "percent", group: "Revenue" },
  { key: "compostDensityLbsPerCY", label: "Finished Compost (lbs/CY)", tip: "Weight of finished compost per cubic yard. Affects shipping calculations.", min: 500, max: 1200, step: 50, format: "number", group: "Revenue" },

  // Shipping
  { key: "trailerCapacityTons", label: "53' Trailer Capacity (tons)", tip: "Max payload for a standard 53-foot trailer hauling finished compost.", min: 15, max: 30, step: 1, format: "number", group: "Shipping" },
  { key: "shippingCostPerLoad", label: "Shipping Cost per Load", tip: "Cost per full truckload to deliver finished compost to buyers.", min: 500, max: 5000, step: 100, format: "currency", group: "Shipping" },

  // Financing
  { key: "loanInterestRate", label: "Loan Interest Rate", tip: "Annual interest rate on the term loan for equipment and buildout.", min: 0.04, max: 0.15, step: 0.005, format: "percent", group: "Financing" },
  { key: "loanTermYears", label: "Loan Term (years)", tip: "Repayment period for the equipment/facility loan.", min: 3, max: 20, step: 1, format: "number", group: "Financing" },
  { key: "equityPercentage", label: "Equity % of CAPEX", tip: "Portion of total CAPEX funded by owner equity vs. debt. 20% equity = 80% loan.", min: 0, max: 1, step: 0.05, format: "percent", group: "Financing" },
  { key: "projectionMonths", label: "Projection Period (months)", tip: "How far into the future to model. 60 months = 5-year projection.", min: 12, max: 120, step: 6, format: "number", group: "Financing" },
];

export const groupOrder = [
  "Revenue",
  "Monthly Operating Costs",
  "Digester Liquid Disposal",
  "Bins & Customers",
  "Equipment CAPEX",
  "Facility CAPEX",
  "Carbon & Amendments",
  "Shipping",
  "Financing",
];
