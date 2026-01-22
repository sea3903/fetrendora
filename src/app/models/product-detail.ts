export interface ProductDetail {
    id: number;
    product_id: number;
    product_name?: string;
    sku: string;
    price: number;
    compare_at_price?: number;
    stock_quantity: number;
    is_active: boolean;
    image_url?: string;
    color_id?: number;
    color_name?: string;
    color_code?: string;
    size_id?: number;
    size_name?: string;
    origin_id?: number;
    origin_name?: string;
    origin_code?: string;
}

export interface ProductDetailDTO {
    product_id: number;
    color_id?: number;
    size_id?: number;
    origin_id?: number;
    sku: string;
    price: number;
    compare_at_price?: number;
    stock_quantity: number;
    is_active: boolean;
    image_url?: string;
}
