import { NextRequest, NextResponse } from 'next/server';
import { getScanById } from '@/lib/db';
import { DEMO_REPORT } from '@/lib/demo/fixtures';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const record = getScanById(id);

    if (!record) {
      // If requested ID is demo id "1", return demo fixture as fallback
      if (id === '1') {
        return NextResponse.json({
          id: '1',
          product_name: DEMO_REPORT.product_name,
          category: DEMO_REPORT.category,
          is_imported: DEMO_REPORT.is_imported,
          country_of_origin: 'India',
          image_path: '/uploads/sample_ghee.jpg',
          extractedData: {
            productName: DEMO_REPORT.product_name,
            manufacturer: 'NutriFoods India Pvt Ltd, Industrial Area, Pune 411018',
            commodityName: 'Almond Butter Cookies',
            mrp: { value: null, currency: 'INR', raw: null, hasInclusiveOfAllTaxes: false },
            netQuantity: { value: 150, unit: 'g', raw: '150 g', isStandardUnit: true },
            manufacturingDate: { month: 8, year: 2026, raw: '08/2026', formatted: '08/2026', isCompliantFormat: true },
            expiryDate: { raw: '08/2026', bestBeforeMonths: 6 },
            consumerCare: { phone: '1800-222-333', email: 'care@nutri.in', address: null, raw: 'Tel: 1800-222-333' },
            countryOfOrigin: 'India',
            isImported: false,
            rawOcrText: '',
            fieldConfidences: {},
            boundingBoxes: {},
          },
          complianceResult: DEMO_REPORT,
          overall_status: DEMO_REPORT.overall_status,
          violations_count: DEMO_REPORT.violations.length,
          inspector_name: 'Field Inspection Officer',
          created_at: new Date().toISOString(),
        });
      }

      return NextResponse.json(
        { error: 'Inspection scan record not found.' },
        { status: 404 }
      );
    }

    const extractedData = JSON.parse(record.extracted_data);
    const complianceResult = JSON.parse(record.compliance_result);
    let rawFaces: any[] = [];
    try {
      rawFaces = record.package_faces ? JSON.parse(record.package_faces) : [];
    } catch {
      rawFaces = [];
    }

    if (!Array.isArray(rawFaces) || rawFaces.length === 0) {
      rawFaces = [{ face: 'FRONT', imagePath: record.image_path, name: 'Front Face' }];
    }

    const normalizedFaces = rawFaces.map((item: any) => {
      if (typeof item === 'string') {
        return {
          face: item.toUpperCase(),
          imagePath: record.image_path,
          name: `${item} Face`,
        };
      }
      return {
        face: (item.face || 'FRONT').toUpperCase(),
        imagePath: item.imagePath || record.image_path,
        name: item.name || `${item.face || 'FRONT'} Face`,
      };
    });

    return NextResponse.json({
      id: record.id,
      product_name: record.product_name,
      category: record.category,
      is_imported: record.is_imported === 1,
      country_of_origin: record.country_of_origin,
      image_path: record.image_path,
      package_faces: normalizedFaces,
      images: normalizedFaces,
      raw_ocr_text: record.raw_ocr_text,
      extractedData,
      complianceResult,
      overall_status: record.overall_status,
      violations_count: record.violations_count,
      inspector_name: record.inspector_name,
      created_at: record.created_at,
    });
  } catch (err: any) {
    console.error('Fetch scan error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve scan record.' },
      { status: 500 }
    );
  }
}
