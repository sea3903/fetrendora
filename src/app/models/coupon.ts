export interface Coupon {
    id?: number;
    code: string;
    name: string;
    description?: string;
    active: boolean;
    discount_type: 'FIXED' | 'PERCENT';
    discount_value: number;
    max_discount_amount?: number;
    min_order_value?: number;
    start_date?: string;
    end_date?: string;
    usage_limit?: number;
    usage_count?: number;
    usage_limit_per_user?: number;
    category_id?: number;
    product_id?: number;
}
