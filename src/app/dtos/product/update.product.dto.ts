export interface UpdateProductDTO {
    name: string;
    price: number;
    description: string;
    category_id: number;
    brand_id?: number;
    sku?: string;
    slug?: string;
    thumbnail?: string;
    selling_attributes?: string;
    is_active?: boolean;
}