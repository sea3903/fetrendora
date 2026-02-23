export interface Comment {
    id: number;
    content: string;
    rating?: number; // Đánh giá sao (1-5)
    product_id: number;
    product_name?: string; // Tên sản phẩm
    product_thumbnail?: string; // Ảnh đại diện sản phẩm
    user: {
        id: number;
        fullname: string;
        email?: string;
        profile_image?: string;
    };
    created_at: string;
    updated_at?: string;
}
