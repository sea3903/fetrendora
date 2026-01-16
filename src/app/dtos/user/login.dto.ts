/**
 * Login DTO - Trendora Fashion
 * Email là primary, phone legacy
 */
export interface LoginDTO {
    email?: string;
    phone_number?: string;
    password: string;
    role_id: number;
}