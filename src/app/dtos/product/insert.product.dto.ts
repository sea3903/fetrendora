import { VariantItem } from './variant-item.dto';

export interface InsertProductDTO {
    name: string;
    price: number;
    description: string;
    category_id: number;
    brand_id?: number;
    sku?: string;
    slug?: string;
    selling_attributes?: string; // 'SIZE', 'COLOR', 'ORIGIN' hoặc kết hợp 'SIZE,COLOR'
    is_active?: boolean;
    images: File[];
    variants?: VariantItem[]; // Danh sách biến thể
}