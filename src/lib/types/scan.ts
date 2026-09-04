import type { PackageFace, ProductCategory } from './enums';

export interface ExtractedFieldInput {
  field_name: string;
  field_value: string | null;
  confidence: number;
  source_image?: string;
  package_face?: PackageFace;
  bounding_box?: number[] | Record<string, number>;
  font_height_mm?: number;
}

export interface ExtractedFieldResponse extends ExtractedFieldInput {
  id: number;
  scan_id: number;
  created_at: string;
}

export interface ScanCreate {
  product_id?: number;
  product?: {
    product_name: string;
    category: ProductCategory;
    subcategory?: string;
    country_of_origin?: string;
    is_imported: boolean;
  };
  image_path?: string;
  package_face?: PackageFace;
  extracted_fields?: ExtractedFieldInput[];
  ocr_data?: Record<string, unknown>;
}

export interface ScanResponse {
  id: number;
  product_id: number;
  image_path?: string;
  scan_status: string;
  overall_result?: string;
  created_at: string;
  extracted_fields: ExtractedFieldResponse[];
}
