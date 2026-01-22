import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../responses/api.response';

export interface SizeDTO {
    name: string;
    description?: string;
}

@Injectable({
    providedIn: 'root'
})
export class SizeService {
    private apiBaseUrl = `${environment.apiBaseUrl}/sizes`;

    constructor(private http: HttpClient) { }

    // Lấy tất cả sizes
    getAllSizes(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(this.apiBaseUrl);
    }

    // Lấy chi tiết size
    getSizeById(id: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiBaseUrl}/${id}`);
    }

    // Tạo size mới
    createSize(sizeDTO: SizeDTO): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(this.apiBaseUrl, sizeDTO);
    }

    // Cập nhật size
    updateSize(id: number, sizeDTO: SizeDTO): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.apiBaseUrl}/${id}`, sizeDTO);
    }

    // Xóa size
    deleteSize(id: number): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(`${this.apiBaseUrl}/${id}`);
    }
}
