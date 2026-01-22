export interface ProductDetailDTO {
    product_id: number;
    sku: string;
    price: number;
    stock_quantity: number;
    is_active: boolean;
    color_id?: number;
    size_id?: number;
    origin_id?: number;
    image_url?: string;
}
