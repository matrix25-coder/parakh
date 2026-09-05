import type {
  StructuredProductData,
  BoundingBox,
  MrpDeclaration,
  NetQuantityDeclaration,
  DateDeclaration,
  ConsumerCareDeclaration,
} from './types';

const STANDARD_METRIC_UNITS = new Set([
  'mg', 'g', 'kg', 'ml', 'l', 'm', 'cm', 'mm', 'n', 'u', 'unit', 'units'
]);

/**
 * Parse raw OCR text into StructuredProductData using Legal Metrology heuristics
 */
export function parseRawOcrText(
  rawText: string,
  initialConfidences?: Record<string, number>,
  initialBoundingBoxes?: Record<string, BoundingBox>,
  contextMetadata?: {
    productName?: string;
    category?: string;
    isImported?: boolean;
    countryOfOrigin?: string;
  }
): StructuredProductData {
  const confidences: Record<string, number> = { ...(initialConfidences || {}) };
  const boundingBoxes: Record<string, BoundingBox> = { ...(initialBoundingBoxes || {}) };

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. MRP Extraction
  const mrp: MrpDeclaration = parseMrp(rawText);
  if (mrp.raw && !confidences.mrp) {
    confidences.mrp = 0.92;
  }

  // 2. Net Quantity Extraction
  const netQuantity: NetQuantityDeclaration = parseNetQuantity(rawText);
  if (netQuantity.raw && !confidences.net_quantity) {
    confidences.net_quantity = 0.94;
  }

  // 3. Manufacturing Date Extraction
  const manufacturingDate: DateDeclaration = parseManufacturingDate(rawText);
  if (manufacturingDate.raw && !confidences.month_year) {
    confidences.month_year = 0.91;
  }

  // 4. Expiry / Best Before Extraction
  const expiryDate = parseExpiryDate(rawText);
  if (expiryDate.raw && !confidences.expiry) {
    confidences.expiry = 0.9;
  }

  // 5. Manufacturer & Packer Extraction
  const { manufacturer, packer, address, pincode } = parseManufacturerAndAddress(rawText, lines);
  if (manufacturer && !confidences.manufacturer_name) {
    confidences.manufacturer_name = pincode ? 0.95 : 0.82;
  }

  // 6. Consumer Care Extraction
  const consumerCare: ConsumerCareDeclaration = parseConsumerCare(rawText);
  if ((consumerCare.phone || consumerCare.email) && !confidences.consumer_care) {
    confidences.consumer_care = consumerCare.phone && consumerCare.email ? 0.93 : 0.78;
  }

  // 7. Country of Origin Extraction
  let countryOfOrigin = parseCountryOfOrigin(rawText) || contextMetadata?.countryOfOrigin || null;
  const isImported = contextMetadata?.isImported ?? (
    countryOfOrigin ? !['india', 'bharat', 'ind'].includes(countryOfOrigin.toLowerCase().trim()) : false
  );
  if (countryOfOrigin && !confidences.country_of_origin) {
    confidences.country_of_origin = 0.95;
  }

  // 8. Product / Commodity Name
  const commodityName = parseCommodityName(rawText, lines, contextMetadata?.productName);
  const productName = contextMetadata?.productName || commodityName || lines[0] || null;
  if (productName && !confidences.commodity_description) {
    confidences.commodity_description = 0.92;
  }

  // Synthetic bounding box positioning fallback if not provided by OCR
  assignDefaultBoundingBoxes(boundingBoxes, {
    manufacturer: !!manufacturer,
    commodityName: !!commodityName,
    netQuantity: !!netQuantity.raw,
    mrp: !!mrp.raw,
    manufacturingDate: !!manufacturingDate.raw,
    consumerCare: !!(consumerCare.phone || consumerCare.email),
  });

  return {
    productName,
    brand: extractBrand(lines),
    commodityName,
    manufacturer,
    packer,
    importer: isImported ? manufacturer : null,
    address,
    pincode,
    mrp,
    netQuantity,
    manufacturingDate,
    expiryDate,
    consumerCare,
    countryOfOrigin: countryOfOrigin || (isImported ? 'Imported' : 'India'),
    isImported,
    rawOcrText: rawText,
    fieldConfidences: confidences,
    boundingBoxes,
    pdpAreaCm2: 180, // Default estimated PDP area
  };
}

// ── SUB-PARSERS ──────────────────────────────────────────────────────────────

function parseMrp(text: string): MrpDeclaration {
  // Regex pattern for MRP with optional currency symbol and taxes phrase
  const mrpRegex = /(?:m\.?r\.?p\.?|max(?:imum)?\.?\s*retail\s*price|retail\s*price)[\s:.]*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
  const match = text.match(mrpRegex);

  let value: number | null = null;
  let raw: string | null = null;
  let hasInclusiveOfAllTaxes = false;

  if (match) {
    raw = match[0];
    const numStr = match[1].replace(/,/g, '');
    value = parseFloat(numStr);
  } else {
    // Fallback: search for stand-alone currency values near price keywords
    const fallback = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(text);
    if (fallback) {
      raw = fallback[0];
      value = parseFloat(fallback[1].replace(/,/g, ''));
    }
  }

  // Statutory requirement: must declare inclusive of all taxes
  const taxRegex = /(?:incl(?:usive)?\.?\s*of\s*all\s*taxes|incl\.?\s*all\s*taxes|incl\.?\s*taxes)/i;
  hasInclusiveOfAllTaxes = taxRegex.test(text);

  return {
    value: isNaN(value as number) ? null : value,
    currency: value ? 'INR' : null,
    raw: raw ? `${raw}${hasInclusiveOfAllTaxes ? ' (Incl. of all taxes)' : ''}` : null,
    hasInclusiveOfAllTaxes,
  };
}

function parseNetQuantity(text: string): NetQuantityDeclaration {
  // Regex for Net Quantity with standard or non-standard metric symbols
  const netQtyRegex = /(?:net\s*(?:qty|quantity|wt|weight)|quantity|net\s*content)[\s:.]*([0-9]+(?:\.[0-9]+)?)\s*(mg|g|kg|ml|l|ltr|gms?|kgs?|gm|units?|n|u)\b/i;
  const match = text.match(netQtyRegex);

  if (match) {
    const rawVal = parseFloat(match[1]);
    let unit = match[2].toLowerCase();
    const isStandard = STANDARD_METRIC_UNITS.has(unit);

    return {
      value: isNaN(rawVal) ? null : rawVal,
      unit,
      raw: `${match[1]} ${match[2]}`,
      isStandardUnit: isStandard,
    };
  }

  // Fallback: look for standalone measurement string like "500 ml" or "200 g"
  const standalone = /\b([0-9]+(?:\.[0-9]+)?)\s*(mg|g|kg|ml|l|ltr|gms?|kgs?|gm)\b/i.exec(text);
  if (standalone) {
    const rawVal = parseFloat(standalone[1]);
    const unit = standalone[2].toLowerCase();
    return {
      value: isNaN(rawVal) ? null : rawVal,
      unit,
      raw: `${standalone[1]} ${standalone[2]}`,
      isStandardUnit: STANDARD_METRIC_UNITS.has(unit),
    };
  }

  return { value: null, unit: null, raw: null, isStandardUnit: false };
}

function parseManufacturingDate(text: string): DateDeclaration {
  // Regex for Mfg / Pkd date (MM/YYYY, MM/YY, or Month YYYY)
  const dateKeywordRegex = /(?:mfd|pkd|mfg|packed|pack\s*date|mfg\s*date|date\s*of\s*mfg|date\s*of\s*pkg)[\s:.]*([0-3]?[0-9][\/\-.][0-1]?[0-9][\/\-.][1-2][0-9]{3}|[0-1]?[0-9][\/\-.][1-2][0-9]{3}|[0-1]?[0-9][\/\-.][0-9]{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,.'-]+[1-2][0-9]{3})/i;
  const match = text.match(dateKeywordRegex);

  if (match) {
    const raw = match[1];
    const slashParts = raw.split(/[\/\-.]/);
    if (slashParts.length === 2) {
      const month = parseInt(slashParts[0], 10);
      let year = parseInt(slashParts[1], 10);
      if (year < 100) year += 2000;
      return {
        month: month >= 1 && month <= 12 ? month : null,
        year: year >= 2000 && year <= 2050 ? year : null,
        raw: match[0],
        formatted: `${String(month).padStart(2, '0')}/${year}`,
        isCompliantFormat: true,
      };
    } else if (slashParts.length === 3) {
      const month = parseInt(slashParts[1], 10);
      let year = parseInt(slashParts[2], 10);
      if (year < 100) year += 2000;
      return {
        month: month >= 1 && month <= 12 ? month : null,
        year: year >= 2000 && year <= 2050 ? year : null,
        raw: match[0],
        formatted: `${String(month).padStart(2, '0')}/${year}`,
        isCompliantFormat: true,
      };
    }

    return {
      month: null,
      year: null,
      raw: match[0],
      formatted: raw,
      isCompliantFormat: true,
    };
  }

  // Standalone date regex like 03/05/2026 or 07/2026
  const standalone3Part = /\b[0-3]?[0-9][\/\-.](0[1-9]|1[0-2])[\/\-.](20[2-3][0-9])\b/.exec(text);
  if (standalone3Part) {
    const month = parseInt(standalone3Part[1], 10);
    const year = parseInt(standalone3Part[2], 10);
    return {
      month,
      year,
      raw: standalone3Part[0],
      formatted: `${standalone3Part[1]}/${standalone3Part[2]}`,
      isCompliantFormat: true,
    };
  }

  const standaloneDate = /\b(0[1-9]|1[0-2])[\/\-](20[2-3][0-9])\b/.exec(text);
  if (standaloneDate) {
    return {
      month: parseInt(standaloneDate[1], 10),
      year: parseInt(standaloneDate[2], 10),
      raw: standaloneDate[0],
      formatted: `${standaloneDate[1]}/${standaloneDate[2]}`,
      isCompliantFormat: true,
    };
  }

  return { month: null, year: null, raw: null, formatted: null, isCompliantFormat: false };
}

function parseExpiryDate(text: string) {
  const expiryRegex = /(?:use\s*by|exp(?:iry)?|best\s*before|expiry\s*date)[\s:.]*([0-3]?[0-9][\/\-.][0-1]?[0-9][\/\-.][1-2][0-9]{3}|[0-1]?[0-9][\/\-.][1-2][0-9]{3}|[0-1]?[0-9][\/\-.][0-9]{2}|[0-9]+\s*(?:months?|days?|years?)\s*(?:from\s*(?:mfg|pkd|packaging))?)/i;
  const match = text.match(expiryRegex);

  if (match) {
    return {
      raw: match[0],
      expiryFormatted: match[1],
    };
  }

  // Standalone expiry like EXP 04/05/2027
  const standaloneExp = /\bexp(?:iry)?[\s:.]*([0-3]?[0-9][\/\-.][0-1]?[0-9][\/\-.][1-2][0-9]{3}|[0-1]?[0-9][\/\-.][1-2][0-9]{3})\b/i.exec(text);
  if (standaloneExp) {
    return {
      raw: standaloneExp[0],
      expiryFormatted: standaloneExp[1],
    };
  }

  return { raw: null, expiryFormatted: null };
}

function parseManufacturerAndAddress(text: string, lines: string[]) {
  let manufacturer: string | null = null;
  let packer: string | null = null;
  let address: string | null = null;
  let pincode: string | null = null;

  // Extract 6-digit Indian PIN code
  const pinMatch = text.match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) {
    pincode = pinMatch[1];
  }

  // Look for "Manufactured by", "Mfd by", "Packed by"
  const mfdLine = lines.find((l) => /^(?:mfd|manufactured|packed|pkd|marketed)\s*by/i.test(l));
  if (mfdLine) {
    manufacturer = mfdLine.replace(/^(?:mfd|manufactured|packed|pkd|marketed)\s*by[\s:.-]*/i, '').trim();
    address = mfdLine;
  } else {
    // Search within text for corporate entities
    const corpMatch = text.match(/(?:(?:mfd|manufactured|packed|pkd)\s*by[\s:.]*)?([a-zA-Z0-9\s.,&-]+(?:pvt\.?\s*ltd\.?|limited|foods|products|industries|llp)[^,\n]*(?:,[^\n]+){0,2})/i);
    if (corpMatch) {
      manufacturer = corpMatch[1].trim();
      address = corpMatch[0].trim();
    }
  }

  return { manufacturer, packer, address, pincode };
}

function parseConsumerCare(text: string): ConsumerCareDeclaration {
  let phone: string | null = null;
  let email: string | null = null;
  let address: string | null = null;

  // Phone / Toll free regex
  const phoneMatch = text.match(/(?:1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}|(?:\+91[- ]?|0)?[6-9][0-9]{9}|\b[0-9]{3,4}[- ][0-9]{6,8}\b)/);
  if (phoneMatch) {
    phone = phoneMatch[0];
  }

  // Email regex
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = emailMatch[0];
  }

  const hasGrievance = /consumer\s*care|customer\s*care|grievance|helpline/i.test(text);
  const raw = phone || email ? `${phone || ''} ${email ? '| ' + email : ''}`.trim() : hasGrievance ? 'Consumer Care Helpline declared' : null;

  return { phone, email, address, raw };
}

function parseCountryOfOrigin(text: string): string | null {
  const originMatch = text.match(/(?:country\s*of\s*origin|made\s*in|manufactured\s*in|imported\s*from)[\s:.]*([a-zA-Z\s]{3,20})/i);
  if (originMatch) {
    return originMatch[1].trim();
  }
  return null;
}

function parseCommodityName(text: string, lines: string[], contextName?: string): string | null {
  if (contextName) return contextName;
  // Look for commodity header lines
  const commodityLine = lines.find((l) => /^(?:product|commodity|generic\s*name)[\s:.]*/i.test(l));
  if (commodityLine) {
    return commodityLine.replace(/^(?:product|commodity|generic\s*name)[\s:.]*/i, '').trim();
  }
  return lines[0] || null;
}

function extractBrand(lines: string[]): string | null {
  if (lines.length > 0 && lines[0].length < 30) {
    return lines[0];
  }
  return null;
}

function assignDefaultBoundingBoxes(
  boxes: Record<string, BoundingBox>,
  present: {
    manufacturer: boolean;
    commodityName: boolean;
    netQuantity: boolean;
    mrp: boolean;
    manufacturingDate: boolean;
    consumerCare: boolean;
  }
) {
  if (present.manufacturer && !boxes.manufacturer_name) {
    boxes.manufacturer_name = { top: 12, left: 10, width: 80, height: 14, face: 'front' };
  }
  if (present.commodityName && !boxes.commodity_description) {
    boxes.commodity_description = { top: 30, left: 10, width: 80, height: 12, face: 'front' };
  }
  if (present.netQuantity && !boxes.net_quantity) {
    boxes.net_quantity = { top: 48, left: 10, width: 40, height: 12, face: 'front' };
  }
  if (present.mrp && !boxes.mrp) {
    boxes.mrp = { top: 48, left: 55, width: 35, height: 12, face: 'front' };
  }
  if (present.manufacturingDate && !boxes.month_year) {
    boxes.month_year = { top: 66, left: 10, width: 40, height: 12, face: 'front' };
  }
  if (present.consumerCare && !boxes.consumer_care) {
    boxes.consumer_care = { top: 66, left: 55, width: 35, height: 14, face: 'back' };
  }
}
