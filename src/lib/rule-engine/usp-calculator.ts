/**
 * PARAKH Unit Sale Price (USP) Statutory Calculator
 * 
 * Enforces Rule 6(11) of the Legal Metrology (Packaged Commodities) Amendment Rules, 2021/2022
 * Mandatory declaration designed to prevent hidden shrinkflation.
 * 
 * Statutory Base Denomination Matrix:
 * - Weight < 1 kg (1000 g): Mandatory base is per 1 g or per 100 g
 * - Weight >= 1 kg: Mandatory base is per 1 kg
 * - Volume < 1 L (1000 ml): Mandatory base is per 1 ml or per 100 ml
 * - Volume >= 1 L: Mandatory base is per 1 L
 * - Length < 1 m: Mandatory base is per 1 cm or per 1 m
 * - Length >= 1 m: Mandatory base is per 1 m
 * - Number/Count: Mandatory base is per 1 Number / Piece (or per pair if applicable)
 */

export interface UspEvaluationInput {
  netQuantityValue: number | null;
  netQuantityUnit: string | null;
  mrpValue: number | null;
  printedUspRaw?: string | null;
  printedUspValue?: number | null;
  printedUspUnit?: string | null;
}

export interface StatutoryBaseUnit {
  denomination: string; // '1 g', '100 g', '1 kg', '1 ml', '100 ml', '1 L', '1 N'
  unitType: 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'COUNT';
  multiplierToStandard: number; // Factor to convert declared unit to this base denomination
}

export interface UspEvaluationResult {
  isUspMandatory: boolean;
  statutoryBaseUnit: string;
  calculatedUsp: number | null; // Rounded to 2 decimal places in INR
  calculatedUspDisplay: string | null; // e.g. "₹ 0.45 per 1 g" or "₹ 45.00 per 100 g"
  printedUspDetected: boolean;
  printedUspValue: number | null;
  printedUspUnit: string | null;
  isArithmeticCompliant: boolean;
  isBaseUnitCompliant: boolean;
  isOverallCompliant: boolean;
  deviationPercentage: number | null;
  status: 'PASS' | 'FAIL' | 'REVIEW' | 'NOT_APPLICABLE';
  violationMessage?: string;
  statutoryReference: string;
}

/**
 * Determine the statutory base unit required under Rule 6(11)
 */
export function getStatutoryBaseDenomination(
  quantity: number,
  unit: string
): StatutoryBaseUnit {
  const normUnit = unit.toLowerCase().trim();

  // 1. WEIGHT COMMODITIES
  if (['g', 'gm', 'gms', 'gram', 'grams'].includes(normUnit)) {
    if (quantity < 1000) {
      // For net weight < 1 kg, per 1 g or per 100 g is permitted
      return {
        denomination: '1 g',
        unitType: 'WEIGHT',
        multiplierToStandard: 1, // unit is already grams
      };
    } else {
      return {
        denomination: '1 kg',
        unitType: 'WEIGHT',
        multiplierToStandard: 0.001, // 1000g = 1kg
      };
    }
  }

  if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(normUnit)) {
    const qtyGrams = quantity * 1000;
    if (qtyGrams < 1000) {
      return {
        denomination: '1 g',
        unitType: 'WEIGHT',
        multiplierToStandard: 1000,
      };
    } else {
      return {
        denomination: '1 kg',
        unitType: 'WEIGHT',
        multiplierToStandard: 1, // unit is already kg
      };
    }
  }

  // 2. VOLUME COMMODITIES
  if (['ml', 'milli-litre', 'millilitre', 'mls'].includes(normUnit)) {
    if (quantity < 1000) {
      return {
        denomination: '1 ml',
        unitType: 'VOLUME',
        multiplierToStandard: 1,
      };
    } else {
      return {
        denomination: '1 L',
        unitType: 'VOLUME',
        multiplierToStandard: 0.001,
      };
    }
  }

  if (['l', 'ltr', 'litre', 'litres', 'liter'].includes(normUnit)) {
    const qtyMl = quantity * 1000;
    if (qtyMl < 1000) {
      return {
        denomination: '1 ml',
        unitType: 'VOLUME',
        multiplierToStandard: 1000,
      };
    } else {
      return {
        denomination: '1 L',
        unitType: 'VOLUME',
        multiplierToStandard: 1,
      };
    }
  }

  // 3. LENGTH COMMODITIES
  if (['cm', 'centimetre', 'centimeter'].includes(normUnit)) {
    if (quantity < 100) {
      return {
        denomination: '1 cm',
        unitType: 'LENGTH',
        multiplierToStandard: 1,
      };
    } else {
      return {
        denomination: '1 m',
        unitType: 'LENGTH',
        multiplierToStandard: 0.01,
      };
    }
  }

  if (['m', 'metre', 'meter'].includes(normUnit)) {
    return {
      denomination: '1 m',
      unitType: 'LENGTH',
      multiplierToStandard: 1,
    };
  }

  // 4. COUNT / UNIT COMMODITIES
  return {
    denomination: '1 N',
    unitType: 'COUNT',
    multiplierToStandard: 1,
  };
}

/**
 * Evaluates full Unit Sale Price (USP) compliance against Rule 6(11)
 */
export function evaluateUspCompliance(input: UspEvaluationInput): UspEvaluationResult {
  const statutoryRef = 'Rule 6(11), Legal Metrology (Packaged Commodities) Amendment Rules, 2021';
  
  const qty = input.netQuantityValue;
  const unit = input.netQuantityUnit;
  const mrp = input.mrpValue;

  // If net quantity or MRP is missing, USP cannot be computed
  if (!qty || qty <= 0 || !unit || !mrp || mrp <= 0) {
    return {
      isUspMandatory: true,
      statutoryBaseUnit: 'Unknown',
      calculatedUsp: null,
      calculatedUspDisplay: null,
      printedUspDetected: false,
      printedUspValue: null,
      printedUspUnit: null,
      isArithmeticCompliant: false,
      isBaseUnitCompliant: false,
      isOverallCompliant: false,
      deviationPercentage: null,
      status: 'REVIEW',
      violationMessage: 'Incomplete Net Quantity or MRP declaration prevents statutory Unit Sale Price calculation.',
      statutoryReference: statutoryRef,
    };
  }

  // Determine statutory base unit
  const baseSpec = getStatutoryBaseDenomination(qty, unit);

  // Calculate quantity in statutory base denomination
  let normalizedQuantity: number;
  if (baseSpec.denomination === '1 g' && (unit.toLowerCase() === 'kg' || unit.toLowerCase() === 'kgs')) {
    normalizedQuantity = qty * 1000;
  } else if (baseSpec.denomination === '1 kg' && (unit.toLowerCase() === 'g' || unit.toLowerCase() === 'gm')) {
    normalizedQuantity = qty / 1000;
  } else if (baseSpec.denomination === '1 ml' && (unit.toLowerCase() === 'l' || unit.toLowerCase() === 'ltr')) {
    normalizedQuantity = qty * 1000;
  } else if (baseSpec.denomination === '1 L' && (unit.toLowerCase() === 'ml')) {
    normalizedQuantity = qty / 1000;
  } else {
    normalizedQuantity = qty;
  }

  const rawUsp = mrp / normalizedQuantity;
  // Statutory rounding: rounded off to the nearest two decimal places
  const calculatedUsp = Math.round(rawUsp * 100) / 100;
  const calculatedUspDisplay = `₹ ${calculatedUsp.toFixed(2)} per ${baseSpec.denomination}`;

  // Analyze printed USP
  const printedRaw = input.printedUspRaw;
  const printedVal = input.printedUspValue;
  const printedUnit = input.printedUspUnit;
  const printedDetected = !!(printedRaw || (printedVal !== undefined && printedVal !== null));

  if (!printedDetected) {
    return {
      isUspMandatory: true,
      statutoryBaseUnit: baseSpec.denomination,
      calculatedUsp,
      calculatedUspDisplay,
      printedUspDetected: false,
      printedUspValue: null,
      printedUspUnit: null,
      isArithmeticCompliant: false,
      isBaseUnitCompliant: false,
      isOverallCompliant: false,
      deviationPercentage: null,
      status: 'FAIL',
      violationMessage: `Mandatory Unit Sale Price (USP) absent from packaging. Statutory requirement: ${calculatedUspDisplay}.`,
      statutoryReference: statutoryRef,
    };
  }

  // If printed USP was detected, check arithmetic accuracy and base denomination validity
  let isArithmeticCompliant = true;
  let isBaseUnitCompliant = true;
  let deviationPct: number | null = null;

  if (printedVal !== null && printedVal !== undefined && printedVal > 0) {
    deviationPct = Math.abs((printedVal - calculatedUsp) / calculatedUsp) * 100;
    // Allow minor 2% rounding margin of error
    isArithmeticCompliant = deviationPct <= 2.0;
  }

  // Verify whether the declared printed unit uses permitted statutory denominations
  if (printedUnit) {
    const pUnitNorm = printedUnit.toLowerCase().replace(/per\s*/i, '').trim();
    const validDenominations = ['1 g', 'g', '100 g', '1 kg', 'kg', '1 ml', 'ml', '100 ml', '1 l', 'l', '1 n', 'n', 'piece', 'unit'];
    isBaseUnitCompliant = validDenominations.some((d) => pUnitNorm.includes(d));
    if (!isBaseUnitCompliant) {
      isArithmeticCompliant = false;
    }
  }

  const isOverallCompliant = isArithmeticCompliant && isBaseUnitCompliant;

  let violationMessage: string | undefined;
  if (!isArithmeticCompliant && deviationPct !== null) {
    violationMessage = `Statutory Defect: Declared Unit Sale Price (${printedRaw || '₹ ' + printedVal}) arithmetically deviates by ${deviationPct.toFixed(1)}% from statutory computed value (${calculatedUspDisplay}).`;
  } else if (!isBaseUnitCompliant) {
    violationMessage = `Statutory Defect: Declared Unit Sale Price uses non-standard base denomination (${printedUnit}). Rule 6(11) permits only standard reference units (${baseSpec.denomination}).`;
  }

  return {
    isUspMandatory: true,
    statutoryBaseUnit: baseSpec.denomination,
    calculatedUsp,
    calculatedUspDisplay,
    printedUspDetected: true,
    printedUspValue: printedVal ?? null,
    printedUspUnit: printedUnit ?? null,
    isArithmeticCompliant,
    isBaseUnitCompliant,
    isOverallCompliant,
    deviationPercentage: deviationPct !== null ? Math.round(deviationPct * 10) / 10 : null,
    status: isOverallCompliant ? 'PASS' : 'FAIL',
    violationMessage,
    statutoryReference: statutoryRef,
  };
}
