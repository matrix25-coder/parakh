export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
  face?: string;
}

export interface MrpDeclaration {
  value: number | null;
  currency: string | null;
  raw: string | null;
  hasInclusiveOfAllTaxes: boolean;
}

export interface NetQuantityDeclaration {
  value: number | null;
  unit: string | null;
  raw: string | null;
  isStandardUnit: boolean;
}

export interface DateDeclaration {
  month: number | null;
  year: number | null;
  raw: string | null;
  formatted: string | null;
  isCompliantFormat: boolean;
}

export interface ConsumerCareDeclaration {
  phone: string | null;
  email: string | null;
  address: string | null;
  raw: string | null;
}

export interface StructuredProductData {
  productName: string | null;
  brand: string | null;
  commodityName: string | null;
  manufacturer: string | null;
  packer: string | null;
  importer: string | null;
  address: string | null;
  pincode: string | null;
  mrp: MrpDeclaration;
  netQuantity: NetQuantityDeclaration;
  manufacturingDate: DateDeclaration;
  expiryDate: {
    raw: string | null;
    bestBeforeMonths?: number | null;
    expiryFormatted?: string | null;
  };
  consumerCare: ConsumerCareDeclaration;
  countryOfOrigin: string | null;
  isImported: boolean;
  rawOcrText: string;
  fieldConfidences: Record<string, number>;
  boundingBoxes: Record<string, BoundingBox>;
  pdpAreaCm2?: number;
}
