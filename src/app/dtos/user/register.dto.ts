/**
 * Register DTO - Trendora Fashion
 * Email là bắt buộc, phone tùy chọn
 */
export interface RegisterDTO {
    fullname: string;
    email: string;
    phone_number?: string;
    address?: string;
    password: string;
    retype_password: string;
    date_of_birth?: Date;
    facebook_account_id?: number;
    google_account_id?: number;
    role_id: number;
}