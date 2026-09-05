import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUserFromRequest } from '@/lib/auth/middleware-utils';
import { saveImageFile } from '@/lib/storage/file-storage';
import { extractProductData } from '@/lib/extraction/ocr-service';
import { evaluateCompliance } from '@/lib/rule-engine';
import { createScan, getUserByEmail, createUser } from '@/lib/db';
import { hashPassword } from '@/lib/auth/passwords';

export async function POST(req: NextRequest) {
  try {
    let authUser = await getAuthUserFromRequest(req);

    // Fallback: If officer is testing without logging in, provide default Officer user
    if (!authUser) {
      let defaultOfficer = getUserByEmail('officer@parakh.gov.in');
      if (!defaultOfficer) {
        const passwordHash = await hashPassword('Parakh@2026');
        defaultOfficer = createUser({
          id: 'usr_default_officer',
          name: 'Field Inspection Officer',
          email: 'officer@parakh.gov.in',
          passwordHash,
        });
      }
      authUser = {
        id: defaultOfficer.id,
        name: defaultOfficer.name,
        email: defaultOfficer.email,
        created_at: defaultOfficer.created_at,
        updated_at: defaultOfficer.updated_at,
      };
    }

    const contentType = req.headers.get('content-type') || '';
    let imageBuffer: Buffer;
    let mimeType = 'image/jpeg';
    let originalFilename = 'package_scan.jpg';
    let productName = '';
    let category = 'FOOD';
    let isImported = false;
    let countryOfOrigin = 'India';
    let packageFace = 'FRONT';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('image') as File | null;
      productName = (formData.get('productName') as string) || '';
      category = (formData.get('category') as string) || 'FOOD';
      isImported = formData.get('isImported') === 'true';
      countryOfOrigin = (formData.get('countryOfOrigin') as string) || (isImported ? 'Imported' : 'India');
      packageFace = (formData.get('face') as string) || 'FRONT';

      if (!file) {
        return NextResponse.json(
          { error: 'Please upload or capture a product image.' },
          { status: 400 }
        );
      }

      mimeType = file.type || 'image/jpeg';
      originalFilename = file.name || 'uploaded_image.jpg';
      const arrayBuffer = await file.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      // JSON body (base64 image or dataUrl)
      const json = await req.json();
      const { image, productName: pName, category: cat, isImported: isImp, countryOfOrigin: origin, face } = json;

      if (!image) {
        return NextResponse.json(
          { error: 'Please upload or capture a product image.' },
          { status: 400 }
        );
      }

      productName = pName || '';
      category = cat || 'FOOD';
      isImported = isImp === true;
      countryOfOrigin = origin || (isImported ? 'Imported' : 'India');
      packageFace = face || 'FRONT';

      // Parse data URL
      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        imageBuffer = Buffer.from(matches[2], 'base64');
      } else {
        imageBuffer = Buffer.from(image, 'base64');
      }
    }

    // 1. Save image to local public/uploads
    const saved = await saveImageFile(imageBuffer, originalFilename);

    // 2. OCR & Structured Extraction
    const extractedData = await extractProductData(imageBuffer, {
      mimeType,
      contextMetadata: {
        productName: productName || undefined,
        category,
        isImported,
        countryOfOrigin,
      },
    });

    // 3. Legal Metrology Rule Engine
    const finalProductName = productName || extractedData.productName || 'Scanned Packaged Commodity';
    const complianceResult = evaluateCompliance(extractedData, {
      productName: finalProductName,
      category,
      isImported,
      countryOfOrigin,
    });

    // 4. Save analysis record in database
    const scanId = crypto.randomUUID();
    complianceResult.scan_id = undefined; // DB generates or assigns scanId

    const scanRecord = createScan({
      id: scanId,
      userId: authUser.id,
      productName: finalProductName,
      category,
      isImported,
      countryOfOrigin,
      imagePath: saved.publicUrl,
      packageFaces: [packageFace],
      rawOcrText: extractedData.rawOcrText,
      extractedData,
      complianceResult,
      overallStatus: complianceResult.overall_status,
      violationsCount: complianceResult.violations.length,
      inspectorName: authUser.name,
    });

    return NextResponse.json({
      success: true,
      scanId: scanRecord.id,
      productName: finalProductName,
      category,
      imagePath: saved.publicUrl,
      extractedData,
      complianceResult,
      overallStatus: complianceResult.overall_status,
      violationsCount: complianceResult.violations.length,
    });
  } catch (err: any) {
    console.error('Scan processing error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process packaged commodity scan.' },
      { status: 500 }
    );
  }
}
