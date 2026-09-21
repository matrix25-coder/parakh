import { NextRequest, NextResponse } from 'next/server';
import { getScanById, createScan } from '@/lib/db';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const record = getScanById(id);

    if (!record) {
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
      latitude: record.latitude ?? null,
      longitude: record.longitude ?? null,
      altitude: record.altitude ?? null,
      accuracy_meters: record.accuracy_meters ?? null,
      establishment_name: record.establishment_name ?? null,
      establishment_address: record.establishment_address ?? null,
      coordinates: (record.latitude && record.longitude) ? {
        latitude: record.latitude,
        longitude: record.longitude,
        altitude: record.altitude,
        accuracyMeters: record.accuracy_meters,
      } : null,
    });
  } catch (err: any) {
    console.error('Fetch scan error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve scan record.' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const scan = body.scanRecord || body;

    if (!scan || !scan.id) {
      return NextResponse.json({ error: 'Invalid scan record provided.' }, { status: 400 });
    }

    const existing = getScanById(id);
    if (!existing) {
      createScan({
        id: scan.id || id,
        userId: 'usr_default_officer',
        productName: scan.product_name || scan.productName || 'Packaged Commodity',
        category: scan.category || 'FOOD',
        isImported: scan.is_imported ?? scan.isImported ?? false,
        countryOfOrigin: scan.country_of_origin || scan.countryOfOrigin || 'India',
        imagePath: scan.image_path || scan.imagePath || '/uploads/uploaded_image.jpg',
        packageFaces: scan.package_faces || scan.images || [],
        rawOcrText: scan.raw_ocr_text || scan.rawOcrText || '',
        extractedData: scan.extractedData || {},
        complianceResult: scan.complianceResult || {},
        overallStatus: scan.overall_status || scan.overallStatus || 'PENDING',
        violationsCount: scan.violations_count ?? scan.violationsCount ?? 0,
        inspectorName: scan.inspector_name || scan.inspectorName || 'Field Inspection Officer',
        latitude: scan.latitude ?? null,
        longitude: scan.longitude ?? null,
        altitude: scan.altitude ?? null,
        accuracyMeters: scan.accuracy_meters ?? scan.accuracy ?? null,
        establishmentName: scan.establishment_name || scan.establishmentName || null,
        establishmentAddress: scan.establishment_address || scan.establishmentAddress || null,
      });
    }

    return NextResponse.json({ success: true, id: scan.id || id });
  } catch (err: any) {
    console.error('Re-seed scan error:', err);
    return NextResponse.json({ error: 'Failed to re-seed scan record.' }, { status: 500 });
  }
}
