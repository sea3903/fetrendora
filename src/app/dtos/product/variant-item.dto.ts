/**
 * Interface for variant item when creating product
 */
export interface VariantItem {
    color_id?: number;
    size_id?: number;
    origin_id?: number;
    price: number;
    stock_quantity: number;
    image_url?: string;
    // For display purposes only (not sent to backend)
    color_name?: string;
    size_name?: string;
    origin_name?: string;
}
