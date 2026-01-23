export interface Comment {
    id: number;
    content: string;
    product_id: number;
    user: {
        id: number;
        fullname: string;
        email: string;
        profile_image?: string;
    };
    created_at: string;
    updated_at?: string;
}
