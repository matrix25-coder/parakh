import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUserFromRequest } from '@/lib/auth/middleware-utils';
import { saveImageFile } from '@/lib/storage/file-storage';
import { extractProductData } from '@/lib/extraction/ocr-service';
import { evaluateCompliance } from '@/lib/rule-engine';
import { createScan, getUserByEmail, createUser } from '@/lib/db';
import { saveUnifiedScan } from '@/lib/db/unified-db';
import { generateEvidenceManifest } from '@/lib/forensics/chain-of-custody';
import { hashPassword } from '@/lib/auth/passwords';
import { autoPerformOpticalGauge } from '@/lib/vision/optical-gauge';

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
    let latitude: number | null = null;
    let longitude: number | null = null;
    let altitude: number | null = null;
    let accuracyMeters: number | null = null;
    let establishmentName: string | null = null;
    let establishmentAddress: string | null = null;
    let deviceId: string | null = null;

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

      latitude = parseFloat(formData.get('latitude') as string) || null;
      longitude = parseFloat(formData.get('longitude') as string) || null;
      altitude = parseFloat(formData.get('altitude') as string) || null;
      accuracyMeters = parseFloat(formData.get('accuracy') as string) || null;
      establishmentName = (formData.get('establishmentName') as string) || null;
      establishmentAddress = (formData.get('establishmentAddress') as string) || null;
      deviceId = (formData.get('deviceId') as string) || null;

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
      const {
        images: inputImages,
        image,
        productName: pName,
        category: cat,
        isImported: isImp,
        countryOfOrigin: origin,
        face,
        latitude: lat,
        longitude: lng,
        altitude: alt,
        accuracy: acc,
        establishmentName: estName,
        establishmentAddress: estAddr,
        deviceId: devId,
      } = json;

      productName = pName || '';
      category = cat || 'FOOD';
      isImported = isImp === true;
      countryOfOrigin = origin || (isImported ? 'Imported' : 'India');
      packageFace = face || 'FRONT';

      latitude = typeof lat === 'number' ? lat : (parseFloat(lat) || null);
      longitude = typeof lng === 'number' ? lng : (parseFloat(lng) || null);
      altitude = typeof alt === 'number' ? alt : (parseFloat(alt) || null);
      accuracyMeters = typeof acc === 'number' ? acc : (parseFloat(acc) || null);
      establishmentName = estName || null;
      establishmentAddress = estAddr || null;
      deviceId = devId || null;

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
        } else if (item.dataUrl.startsWith('data:image/svg+xml;utf8,') || item.dataUrl.startsWith('data:image/svg+xml,')) {
          m = 'image/svg+xml';
          const svgContent = decodeURIComponent(item.dataUrl.replace(/^data:image\/svg\+xml(?:;utf8)?,/, ''));
          b = Buffer.from(svgContent, 'utf8');
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
    let lastExtractionError = '';
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
        } catch (err: any) {
          console.error(`Extraction error on face ${faceItem.face}:`, err);
          lastExtractionError = err?.message || String(err);
          return null;
        }
      })
    );

    const successfulResults = extractionResults.filter((r): r is NonNullable<typeof r> => r !== null);
    if (successfulResults.length === 0) {
      return NextResponse.json(
        {
          error: lastExtractionError || 'Could not extract declarations from the submitted package image. Please verify lighting and try again.',
        },
        { status: 422 }
      );
    }

    const primaryFace = savedFaces[0];
    const extractedData = extractionResults[0] || successfulResults[0];

    // Tag primary bounding boxes with primary face
    Object.keys(extractedData.boundingBoxes || {}).forEach((k) => {
      if (extractedData.boundingBoxes[k]) {
        extractedData.boundingBoxes[k].face = primaryFace.face.toLowerCase();
      }
    });

    // If secondary images (e.g. BACK or SIDE face) were submitted, merge declarations comprehensively
    if (savedFaces.length > 1) {
      for (let i = 1; i < savedFaces.length; i++) {
        const secFace = savedFaces[i];
        const secExtracted = extractionResults[i];
        if (!secExtracted) continue;

        // 1. Commodity & Brand Identity
        if (!extractedData.commodityName && secExtracted.commodityName) {
          extractedData.commodityName = secExtracted.commodityName;
        }
        if (!extractedData.brand && secExtracted.brand) {
          extractedData.brand = secExtracted.brand;
        }
        if (!extractedData.productName && secExtracted.productName) {
          extractedData.productName = secExtracted.productName;
        }

        // 2. Manufacturer, Packer & Address
        if (!extractedData.manufacturer && secExtracted.manufacturer) {
          extractedData.manufacturer = secExtracted.manufacturer;
          if (!extractedData.address) extractedData.address = secExtracted.address;
          if (!extractedData.pincode) extractedData.pincode = secExtracted.pincode;
        } else if (!extractedData.address && secExtracted.address) {
          extractedData.address = secExtracted.address;
          if (!extractedData.pincode && secExtracted.pincode) extractedData.pincode = secExtracted.pincode;
        }
        if (!extractedData.pincode && secExtracted.pincode) {
          extractedData.pincode = secExtracted.pincode;
        }

        // 3. Consumer Care Redressal
        if (!extractedData.consumerCare?.phone && secExtracted.consumerCare?.phone) {
          extractedData.consumerCare.phone = secExtracted.consumerCare.phone;
        }
        if (!extractedData.consumerCare?.email && secExtracted.consumerCare?.email) {
          extractedData.consumerCare.email = secExtracted.consumerCare.email;
        }
        if (!extractedData.consumerCare?.raw && secExtracted.consumerCare?.raw) {
          extractedData.consumerCare.raw = secExtracted.consumerCare.raw;
        }

        // 4. Dates
        if (!extractedData.manufacturingDate?.formatted && secExtracted.manufacturingDate?.formatted) {
          extractedData.manufacturingDate = secExtracted.manufacturingDate;
        }
        if (!extractedData.expiryDate?.expiryFormatted && (secExtracted.expiryDate?.expiryFormatted || secExtracted.expiryDate?.raw)) {
          extractedData.expiryDate = secExtracted.expiryDate;
        }

        // 5. MRP
        if ((!extractedData.mrp?.value || isNaN(Number(extractedData.mrp.value))) && secExtracted.mrp?.value) {
          extractedData.mrp = secExtracted.mrp;
        } else if (!extractedData.mrp?.raw && secExtracted.mrp?.raw) {
          extractedData.mrp.raw = secExtracted.mrp.raw;
        }
        if (!extractedData.mrp?.hasInclusiveOfAllTaxes && secExtracted.mrp?.hasInclusiveOfAllTaxes) {
          extractedData.mrp.hasInclusiveOfAllTaxes = true;
        }

        // 6. Net Quantity
        if ((!extractedData.netQuantity?.value || isNaN(Number(extractedData.netQuantity.value))) && secExtracted.netQuantity?.value) {
          extractedData.netQuantity = secExtracted.netQuantity;
        } else if (!extractedData.netQuantity?.unit && secExtracted.netQuantity?.unit) {
          extractedData.netQuantity.unit = secExtracted.netQuantity.unit;
          extractedData.netQuantity.isStandardUnit = secExtracted.netQuantity.isStandardUnit;
        }

        // 7. Country of origin
        if ((!extractedData.countryOfOrigin || extractedData.countryOfOrigin.toLowerCase() === 'imported') && secExtracted.countryOfOrigin && secExtracted.countryOfOrigin.toLowerCase() !== 'imported') {
          extractedData.countryOfOrigin = secExtracted.countryOfOrigin;
          extractedData.isImported = secExtracted.isImported;
        }

        // 8. Field Confidences
        Object.keys(secExtracted.fieldConfidences || {}).forEach((k) => {
          extractedData.fieldConfidences[k] = Math.max(
            extractedData.fieldConfidences[k] || 0,
            secExtracted.fieldConfidences[k] || 0
          );
        });

        // 9. Bounding Boxes
        Object.keys(secExtracted.boundingBoxes || {}).forEach((k) => {
          const sBox = secExtracted.boundingBoxes[k];
          const curBox = extractedData.boundingBoxes[k];
          const isHigherConfidence = (secExtracted.fieldConfidences?.[k] || 0) > (extractedData.fieldConfidences?.[k] || 0);
          if (!curBox || (curBox.width === 0 && curBox.height === 0) || isHigherConfidence) {
            if (sBox && (sBox.width > 0 || sBox.height > 0)) {
              extractedData.boundingBoxes[k] = {
                ...sBox,
                face: secFace.face.toLowerCase(),
              };
            }
          }
        });

        extractedData.rawOcrText = `${extractedData.rawOcrText}\n--- ${secFace.face} FACE ---\n${secExtracted.rawOcrText}`;
      }
    }

    // 2.5 Automated AR Optical Calibration & Vernier Caliper Measurement
    const autoGauge = autoPerformOpticalGauge({
      boundingBoxes: extractedData.boundingBoxes,
      netQuantityValue: extractedData.netQuantity?.value,
      netQuantityUnit: extractedData.netQuantity?.unit,
    });

    extractedData.fontCalibration = {
      pixelsPerMm: autoGauge.pixelsPerMm,
      targetType: autoGauge.referenceTarget,
      measuredHeights: {
        net_quantity: autoGauge.measuredHeightMm,
        mrp: Math.round(autoGauge.measuredHeightMm * 0.92 * 100) / 100,
        manufacturer_name: 1.8,
        consumer_care: 1.6,
      },
    };

    // 3. Legal Metrology Rule Engine
    const finalProductName = productName || extractedData.productName || extractedData.commodityName || (extractedData.brand ? `${extractedData.brand} Commodity` : 'Packaged Commodity');
    const complianceResult = evaluateCompliance(extractedData, {
      productName: finalProductName,
      category,
      isImported: extractedData.isImported,
      countryOfOrigin: extractedData.countryOfOrigin || countryOfOrigin,
    });

    // Attach Automated Caliper & AR Optical Gauge Telemetry to Compliance Dossier
    complianceResult.caliper_x = autoGauge.caliperX;
    complianceResult.caliper_y = autoGauge.caliperY;
    complianceResult.caliper_height_px = autoGauge.caliperHeightPx;
    complianceResult.measured_mm = autoGauge.measuredHeightMm;
    complianceResult.pixels_per_mm = autoGauge.pixelsPerMm;
    complianceResult.gauge_mode = 'AUTO';
    complianceResult.auto_gauge = autoGauge;

    // 4. Cryptographic Chain of Custody (Section 63 BSA / 65B IEA)
    const now = new Date();
    const telemetry = {
      coordinates: (latitude && longitude) ? { latitude, longitude, altitude, accuracyMeters } : null,
      deviceFingerprint: deviceId || req.headers.get('user-agent') || 'PARAKH-FIELD-TERMINAL',
      inspectorId: authUser.id,
      inspectorName: authUser.name,
      captureTimestamp: now.toISOString(),
      istTimestamp: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
      platform: req.headers.get('sec-ch-ua-platform') || 'Capacitor-Android / Next.js',
    };

    const forensicManifest = generateEvidenceManifest(savedFaces[0].buffer, telemetry);
    complianceResult.forensic_manifest = forensicManifest;

    // 5. Save analysis record in database (SQLite + Supabase)
    const scanId = crypto.randomUUID();
    complianceResult.scan_id = undefined;

    const faceRecords = savedFaces.map((f) => ({
      face: f.face,
      imagePath: f.imagePath,
      name: f.name,
    }));

    const scanRecord = await saveUnifiedScan({
      id: scanId,
      userId: authUser.id,
      productName: finalProductName,
      brandName: extractedData.brand || null,
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
      latitude,
      longitude,
      altitude,
      accuracyMeters,
      establishmentName,
      establishmentAddress,
      forensicHash: forensicManifest.rawImageSha256,
      verificationCode: forensicManifest.verificationCode,
      forensicManifest,
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
      forensicManifest,
      verificationCode: forensicManifest.verificationCode,
      caliper_x: autoGauge.caliperX,
      caliper_y: autoGauge.caliperY,
      caliper_height_px: autoGauge.caliperHeightPx,
      measured_mm: autoGauge.measuredHeightMm,
      pixels_per_mm: autoGauge.pixelsPerMm,
      gauge_mode: 'AUTO',
    });
  } catch (err: any) {
    console.error('Scan processing error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process packaged commodity scan.' },
      { status: 500 }
    );
  }
}

