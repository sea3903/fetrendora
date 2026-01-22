import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../responses/api.response';

export interface OriginDTO {
    name: string;
    code?: string;
}

@Injectable({
    providedIn: 'root'
})
export class OriginService {
    private apiBaseUrl = `${environment.apiBaseUrl}/origins`;

    constructor(private http: HttpClient) { }

    // Lấy tất cả origins
    getAllOrigins(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(this.apiBaseUrl);
    }

    // Lấy chi tiết origin
    getOriginById(id: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiBaseUrl}/${id}`);
    }

    // Tạo origin mới
    createOrigin(originDTO: OriginDTO): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(this.apiBaseUrl, originDTO);
    }

    // Cập nhật origin
    updateOrigin(id: number, originDTO: OriginDTO): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.apiBaseUrl}/${id}`, originDTO);
    }

    // Xóa origin
    deleteOrigin(id: number): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(`${this.apiBaseUrl}/${id}`);
    }
}
