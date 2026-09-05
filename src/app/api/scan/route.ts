import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUserFromRequest } from '@/lib/auth/middleware-utils';
import { saveImageFile } from '@/lib/storage/file-storage';
import { extractProductData } from '@/lib/extraction/ocr-service';
import { evaluateCompliance } from '@/lib/rule-engine';
import { createScan, getUserByEmail, createUser } from '@/lib/db';
import { hashPassword } from '@/lib/auth/passwords';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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

    interface SavedImageFace {
      face: string;
      imagePath: string;
      name: string;
      buffer: Buffer;
      mimeType: string;
    }

    const savedFaces: SavedImageFace[] = [];

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

      const saved = await saveImageFile(imageBuffer, originalFilename);
      savedFaces.push({
        face: packageFace.toUpperCase(),
        imagePath: saved.publicUrl,
        name: originalFilename,
        buffer: imageBuffer,
        mimeType,
      });
    } else {
      // JSON body (supports images array or single image)
      const json = await req.json();
      const { images: inputImages, image, productName: pName, category: cat, isImported: isImp, countryOfOrigin: origin, face } = json;

      productName = pName || '';
      category = cat || 'FOOD';
      isImported = isImp === true;
      countryOfOrigin = origin || (isImported ? 'Imported' : 'India');
      packageFace = face || 'FRONT';

      const rawImages: Array<{ dataUrl: string; face: string; name?: string }> = [];

      if (inputImages && Array.isArray(inputImages) && inputImages.length > 0) {
        inputImages.forEach((img: any) => {
          const url = img.dataUrl || img.image;
          if (url) {
            rawImages.push({
              dataUrl: url,
              face: img.face || 'FRONT',
              name: img.name || `${img.face || 'FRONT'}_face.jpg`,
            });
          }
        });
      } else if (image) {
        rawImages.push({
          dataUrl: image,
          face: face || 'FRONT',
          name: `${face || 'FRONT'}_face.jpg`,
        });
      }

      if (rawImages.length === 0) {
        return NextResponse.json(
          { error: 'Please upload or capture at least one product image.' },
          { status: 400 }
        );
      }

      for (const item of rawImages) {
        let b: Buffer;
        let m = 'image/jpeg';
        const matches = item.dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          m = matches[1];
          b = Buffer.from(matches[2], 'base64');
        } else {
          b = Buffer.from(item.dataUrl, 'base64');
        }

        const saved = await saveImageFile(b, item.name);
        savedFaces.push({
          face: (item.face || 'FRONT').toUpperCase(),
          imagePath: saved.publicUrl,
          name: item.name || `${item.face} Face`,
          buffer: b,
          mimeType: m,
        });
      }

      imageBuffer = savedFaces[0].buffer;
      mimeType = savedFaces[0].mimeType;
      packageFace = savedFaces[0].face;
    }

    // 2. OCR & Structured Extraction across submitted faces IN PARALLEL
    const extractionResults = await Promise.all(
      savedFaces.map(async (faceItem) => {
        try {
          return await extractProductData(faceItem.buffer, {
            mimeType: faceItem.mimeType,
            contextMetadata: {
              productName: productName || undefined,
              category,
              isImported,
              countryOfOrigin,
            },
          });
        } catch (err) {
          console.warn(`Extraction error on face ${faceItem.face}:`, err);
          return null;
        }
      })
    );

    const primaryFace = savedFaces[0];
    const extractedData = extractionResults[0] || {
      productName: productName || 'Packaged Commodity',
      brand: null,
      commodityName: null,
      manufacturer: null,
      packer: null,
      importer: null,
      address: null,
      pincode: null,
      mrp: { value: null, currency: null, raw: null, hasInclusiveOfAllTaxes: false },
      netQuantity: { value: null, unit: null, raw: null, isStandardUnit: false },
      manufacturingDate: { month: null, year: null, raw: null, formatted: null, isCompliantFormat: false },
      expiryDate: { raw: null, expiryFormatted: null },
      consumerCare: { phone: null, email: null, address: null, raw: null },
      countryOfOrigin: countryOfOrigin || 'India',
      isImported,
      rawOcrText: '',
      fieldConfidences: {},
      boundingBoxes: {},
      pdpAreaCm2: 180,
    };

    // Tag primary bounding boxes with primary face
    Object.keys(extractedData.boundingBoxes || {}).forEach((k) => {
      if (extractedData.boundingBoxes[k]) {
        extractedData.boundingBoxes[k].face = primaryFace.face.toLowerCase();
      }
    });

    // If secondary images (e.g. BACK face) were submitted, merge declarations
    if (savedFaces.length > 1) {
      for (let i = 1; i < savedFaces.length; i++) {
        const secFace = savedFaces[i];
        const secExtracted = extractionResults[i];
        if (!secExtracted) continue;

        // Merge fields if missing in primary extraction
        if (!extractedData.manufacturer && secExtracted.manufacturer) {
          extractedData.manufacturer = secExtracted.manufacturer;
          extractedData.address = secExtracted.address;
          extractedData.pincode = secExtracted.pincode;
        }
        if (
          (!extractedData.consumerCare?.phone && !extractedData.consumerCare?.email && !extractedData.consumerCare?.raw) &&
          (secExtracted.consumerCare?.phone || secExtracted.consumerCare?.email || secExtracted.consumerCare?.raw)
        ) {
          extractedData.consumerCare = secExtracted.consumerCare;
        }
        if (!extractedData.manufacturingDate?.formatted && secExtracted.manufacturingDate?.formatted) {
          extractedData.manufacturingDate = secExtracted.manufacturingDate;
        }
        if (!extractedData.expiryDate?.expiryFormatted && (secExtracted.expiryDate?.expiryFormatted || secExtracted.expiryDate?.raw)) {
          extractedData.expiryDate = secExtracted.expiryDate;
        }
        if (!extractedData.mrp?.value && secExtracted.mrp?.value) {
          extractedData.mrp = secExtracted.mrp;
        }
        if (!extractedData.netQuantity?.value && secExtracted.netQuantity?.value) {
          extractedData.netQuantity = secExtracted.netQuantity;
        }

        // Merge bounding boxes tagged with this face
        Object.keys(secExtracted.boundingBoxes || {}).forEach((k) => {
          if (!extractedData.boundingBoxes[k]) {
            extractedData.boundingBoxes[k] = {
              ...secExtracted.boundingBoxes[k],
              face: secFace.face.toLowerCase(),
            };
          }
        });

        extractedData.rawOcrText = `${extractedData.rawOcrText}\n--- ${secFace.face} FACE ---\n${secExtracted.rawOcrText}`;
      }
    }

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
    complianceResult.scan_id = undefined;

    const faceRecords = savedFaces.map((f) => ({
      face: f.face,
      imagePath: f.imagePath,
      name: f.name,
    }));

    const scanRecord = createScan({
      id: scanId,
      userId: authUser.id,
      productName: finalProductName,
      category,
      isImported,
      countryOfOrigin,
      imagePath: savedFaces[0].imagePath,
      packageFaces: faceRecords as any,
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
      imagePath: savedFaces[0].imagePath,
      package_faces: faceRecords,
      images: faceRecords,
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
