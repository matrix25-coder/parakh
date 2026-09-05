import { evaluateCompliance } from '@/lib/rule-engine';

export const WELLCORE_EXTRACTED_DATA = {
  productName: 'Wellcore Micronised Creatine Monohydrate',
  brand: 'Wellcore',
  commodityName: 'Micronised Creatine Monohydrate',
  manufacturer: 'Wellversed Health Private Limited',
  packer: 'Wellversed Health Private Limited',
  importer: null,
  address: 'Plot No. 771, Phase-V, Udyog Vihar, Sector 19, Gurugram, Haryana - 122008',
  pincode: '122008',
  mrp: {
    value: 699,
    currency: 'INR',
    raw: '₹ 699.00 (Incl. of all taxes)',
    hasInclusiveOfAllTaxes: true,
  },
  netQuantity: {
    value: 100,
    unit: 'g',
    raw: '100 g',
    isStandardUnit: true,
  },
  manufacturingDate: {
    month: 5,
    year: 2024,
    raw: '05/2024',
    formatted: '05/2024',
    isCompliantFormat: true,
  },
  expiryDate: {
    raw: '05/2026',
    expiryFormatted: '05/2026',
    bestBeforeMonths: 24,
  },
  consumerCare: {
    phone: '+91-9319157249',
    email: 'support@wellcore.in',
    address: 'Plot No. 771, Phase-V, Udyog Vihar, Sector 19, Gurugram, Haryana - 122008',
    raw: 'Contact: +91-9319157249 / support@wellcore.in',
  },
  countryOfOrigin: 'India',
  isImported: false,
  rawOcrText: 'WELLCORE MICRONISED CREATINE MONOHYDRATE 100g ₹699 Wellversed Health Private Limited Gurugram Haryana 122008',
  fieldConfidences: {
    commodity_description: 0.99,
    manufacturer_name: 0.98,
    net_quantity: 0.99,
    mrp: 0.98,
    month_year: 0.95,
    consumer_care: 0.96,
    country_of_origin: 0.99,
  },
  boundingBoxes: {
    commodity_description: { top: 54.5, left: 22.0, width: 42.0, height: 5.0, face: 'front' },
    net_quantity: { top: 73.0, left: 45.0, width: 12.0, height: 3.0, face: 'front' },
    consumer_care: { top: 51.5, left: 24.5, width: 35.0, height: 5.5, face: 'back' },
    manufacturer_name: { top: 56.5, left: 24.5, width: 35.0, height: 5.0, face: 'back' },
    month_year: { top: 64.0, left: 32.0, width: 25.0, height: 4.5, face: 'back' },
    mrp: { top: 56.5, left: 44.5, width: 15.0, height: 4.5, face: 'side' },
    country_of_origin: { top: 60.0, left: 24.5, width: 35.0, height: 3.5, face: 'back' },
  },
  pdpAreaCm2: 195,
};

export const WELLCORE_COMPLIANCE_RESULT = evaluateCompliance(WELLCORE_EXTRACTED_DATA as any, {
  productName: 'Wellcore Micronised Creatine Monohydrate',
  category: 'FOOD',
  isImported: false,
  countryOfOrigin: 'India',
});

export const WELLCORE_PACKAGE_FACES = [
  {
    face: 'FRONT',
    imagePath: '/uploads/wellcore_front.jpg',
    name: 'Front Face (Principal Display Panel)',
  },
  {
    face: 'BACK',
    imagePath: '/uploads/wellcore_back.jpg',
    name: 'Back Face (Information & Manufacturer Details)',
  },
  {
    face: 'SIDE',
    imagePath: '/uploads/wellcore_side.jpg',
    name: 'Side Face (Statutory MRP & Batch Details)',
  },
];

export const WELLCORE_SCAN_FIXTURE = {
  id: 'wellcore-creatine-analysis',
  product_name: 'Wellcore Micronised Creatine Monohydrate',
  category: 'FOOD',
  is_imported: false,
  country_of_origin: 'India',
  image_path: '/uploads/wellcore_front.jpg',
  package_faces: WELLCORE_PACKAGE_FACES,
  images: WELLCORE_PACKAGE_FACES,
  raw_ocr_text: WELLCORE_EXTRACTED_DATA.rawOcrText,
  extractedData: WELLCORE_EXTRACTED_DATA,
  complianceResult: WELLCORE_COMPLIANCE_RESULT,
  overall_status: WELLCORE_COMPLIANCE_RESULT.overall_status,
  violations_count: WELLCORE_COMPLIANCE_RESULT.violations.length,
  inspector_name: 'Legal Metrology Field Officer',
  created_at: '2026-09-05T11:25:00.000Z',
};
