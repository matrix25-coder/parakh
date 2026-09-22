import { NextRequest, NextResponse } from 'next/server';
import { getScanById, updateScanReview, createScan } from '@/lib/db';
import { evaluateCompliance } from '@/lib/rule-engine';
import { getAuthUserFromRequest } from '@/lib/auth/middleware-utils';
import type { StructuredProductData } from '@/lib/extraction/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { fields, productName, category, isImported, countryOfOrigin } = body;

    let record = getScanById(id);
    const authUser = await getAuthUserFromRequest(req);
    const userId = authUser?.id || record?.user_id || 'usr_default_officer';

    // Load and update extracted data
    let currentData: StructuredProductData;
    if (record) {
      currentData = JSON.parse(record.extracted_data);
    } else {
      currentData = {
        productName: productName || 'Packaged Commodity',
        brand: null,
        commodityName: null,
        manufacturer: null,
        packer: null,
        importer: null,
        address: null,
        pincode: null,
        mrp: { value: null, currency: 'INR', raw: null, hasInclusiveOfAllTaxes: false },
        netQuantity: { value: null, unit: null, raw: null, isStandardUnit: false },
        manufacturingDate: { month: null, year: null, raw: null, formatted: null, isCompliantFormat: false },
        expiryDate: { raw: null },
        consumerCare: { phone: null, email: null, address: null, raw: null },
        countryOfOrigin: countryOfOrigin || 'India',
        isImported: isImported || false,
        rawOcrText: '',
        fieldConfidences: {},
        boundingBoxes: {},
        pdpAreaCm2: 180,
      };
    }

    // Apply edited fields from review table
    if (Array.isArray(fields)) {
      fields.forEach((f: { field_name: string; value: string }) => {
        const val = f.value?.trim() || '';
        switch (f.field_name) {
          case 'manufacturer_name':
            currentData.manufacturer = val || null;
            currentData.address = val || null;
            // Recheck PIN code
            const pin = val.match(/\b([1-9][0-9]{5})\b/);
            if (pin) currentData.pincode = pin[1];
            break;
          case 'commodity_description':
            currentData.commodityName = val || null;
            break;
          case 'net_quantity':
            const num = parseFloat(val);
            currentData.netQuantity.value = isNaN(num) ? null : num;
            currentData.netQuantity.raw = val;
            break;
          case 'unit':
            currentData.netQuantity.unit = val.toLowerCase();
            currentData.netQuantity.isStandardUnit = ['mg', 'g', 'kg', 'ml', 'l', 'n', 'u'].includes(val.toLowerCase());
            break;
          case 'mrp':
            const clean = val.replace(/[^0-9.]/g, '');
            const p = parseFloat(clean);
            currentData.mrp.value = isNaN(p) ? null : p;
            currentData.mrp.raw = val;
            currentData.mrp.currency = 'INR';
            currentData.mrp.hasInclusiveOfAllTaxes =
              currentData.mrp.hasInclusiveOfAllTaxes ||
              /incl(?:usive)?\.?\s*of\s*all\s*taxes|incl\.?\s*taxes/i.test(val) ||
              !val.toLowerCase().includes('exclusive');
            break;
          case 'month_year':
            currentData.manufacturingDate.raw = val;
            currentData.manufacturingDate.formatted = val;
            currentData.manufacturingDate.isCompliantFormat = true;
            break;
          case 'country_of_origin':
            currentData.countryOfOrigin = val;
            currentData.isImported = val ? !['india', 'bharat', 'ind'].includes(val.toLowerCase().trim()) : false;
            break;
          case 'consumer_care':
            currentData.consumerCare.raw = val;
            const phone = val.match(/(?:1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}|[6-9][0-9]{9})/);
            if (phone) currentData.consumerCare.phone = phone[0];
            const email = val.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (email) currentData.consumerCare.email = email[0];
            break;
        }
      });
    }

    const resolvedIsImported = isImported !== undefined
      ? isImported
      : currentData.isImported !== undefined
      ? currentData.isImported
      : record ? record.is_imported === 1 : false;

    // Re-evaluate Rule Engine with updated declarations
    const newCompliance = evaluateCompliance(currentData, {
      productName: productName || record?.product_name || 'Packaged Commodity',
      category: category || record?.category || 'FOOD',
      isImported: resolvedIsImported,
      countryOfOrigin: countryOfOrigin || currentData.countryOfOrigin || record?.country_of_origin || undefined,
    });

    // Update or create record in database
    if (record) {
      updateScanReview(
        id,
        record.user_id,
        currentData,
        newCompliance,
        newCompliance.overall_status,
        newCompliance.violations.length
      );
    } else {
      createScan({
        id,
        userId,
        productName: productName || 'Packaged Commodity',
        category: category || 'FOOD',
        isImported: resolvedIsImported,
        countryOfOrigin: countryOfOrigin || currentData.countryOfOrigin || 'India',
        imagePath: '/uploads/uploaded_image.jpg',
        packageFaces: [],
        rawOcrText: '',
        extractedData: currentData,
        complianceResult: newCompliance,
        overallStatus: newCompliance.overall_status,
        violationsCount: newCompliance.violations.length,
      });
    }

    return NextResponse.json({
      success: true,
      extractedData: currentData,
      complianceResult: newCompliance,
      overallStatus: newCompliance.overall_status,
    });
  } catch (err: any) {
    console.error('Update scan review error:', err);
    return NextResponse.json(
      { error: 'Failed to update declarations review.' },
      { status: 500 }
    );
  }
}
