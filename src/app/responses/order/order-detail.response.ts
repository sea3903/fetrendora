export interface OrderDetailResponse {
    id: number;
    order_id: number;
    product_id: number;
    product_name: string;
    thumbnail: string;
    price: number;
    number_of_products: number;
    total_money: number;
    color?: string;
}
