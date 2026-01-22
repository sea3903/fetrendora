import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../responses/api.response';
import { ProductDetailDTO } from '../dtos/product/product-detail.dto';
import { TokenService } from './token.service';

@Injectable({
    providedIn: 'root'
})
export class ProductDetailService {
    private apiUrl = `${environment.apiBaseUrl}/product-details`;
    private http = inject(HttpClient);
    private tokenService = inject(TokenService);

    private get apiConfig() {
        return {
            headers: new HttpHeaders({
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.tokenService.getToken()}`
            })
        };
    }

    getByProductId(productId: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiUrl}/product/${productId}`);
    }

    getById(id: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiUrl}/${id}`);
    }

    create(dto: ProductDetailDTO): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(this.apiUrl, dto, this.apiConfig);
    }

    update(id: number, dto: ProductDetailDTO): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, dto, this.apiConfig);
    }

    delete(id: number): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`, this.apiConfig);
    }

    /**
     * Upload hình ảnh cho biến thể sản phẩm
     * @param file - File hình ảnh cần upload
     * @returns Observable với data là filename (string)
     */
    uploadVariantImage(file: File): Observable<ApiResponse> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<ApiResponse>(`${this.apiUrl}/upload-image`, formData, {
            headers: new HttpHeaders({
                Authorization: `Bearer ${this.tokenService.getToken()}`
                // Không set Content-Type, để browser tự set với boundary
            })
        });
    }
}
