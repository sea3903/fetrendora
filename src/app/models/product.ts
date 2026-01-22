import { ProductImage } from "./product.image";

export interface Product {
  id: number;
  name: string;
  price: number;
  thumbnail: string;
  description: string;
  sku?: string;
  slug?: string;
  category_id: number;
  category_name?: string;
  brand_id?: number;
  brand_name?: string;
  selling_attributes?: string; // 'SIZE', 'COLOR', 'ORIGIN' hoặc kết hợp
  is_active?: boolean;
  url: string;
  product_images: ProductImage[];
}