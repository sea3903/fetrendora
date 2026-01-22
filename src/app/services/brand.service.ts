import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Brand } from '../models/brand';
import { ApiResponse } from '../responses/api.response';

export interface BrandDTO {
    name: string;
    slug?: string;
    description?: string;
    logoUrl?: string;
}

@Injectable({
    providedIn: 'root'
})
export class BrandService {
    private apiBaseUrl = `${environment.apiBaseUrl}/brands`;

    constructor(private http: HttpClient) { }

    // Lấy tất cả brands (cho dropdown)
    getAllBrands(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiBaseUrl}/all`);
    }

    // Lấy brands có phân trang và tìm kiếm
    getBrands(keyword: string = '', page: number = 0, limit: number = 10): Observable<ApiResponse> {
        const params = new HttpParams()
            .set('keyword', keyword)
            .set('page', page.toString())
            .set('limit', limit.toString());
        return this.http.get<ApiResponse>(this.apiBaseUrl, { params });
    }

    // Lấy chi tiết brand
    getBrandById(id: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiBaseUrl}/${id}`);
    }

    // Tạo brand mới
    createBrand(brandDTO: BrandDTO): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(this.apiBaseUrl, brandDTO);
    }

    // Cập nhật brand
    updateBrand(id: number, brandDTO: BrandDTO): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.apiBaseUrl}/${id}`, brandDTO);
    }

    // Xóa brand
    deleteBrand(id: number): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(`${this.apiBaseUrl}/${id}`);
    }

    // Upload logo
    uploadLogo(id: number, file: File): Observable<ApiResponse> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<ApiResponse>(`${this.apiBaseUrl}/${id}/logo`, formData);
    }

    // Get logo URL - hỗ trợ cả URL external và local file
    getLogoUrl(logoUrl: string | undefined): string {
        if (!logoUrl) return '';
        // Nếu là URL đầy đủ (http/https) thì dùng trực tiếp
        if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
            return logoUrl;
        }
        // Ngược lại, là tên file local
        return `${this.apiBaseUrl}/logos/${logoUrl}`;
    }
}
