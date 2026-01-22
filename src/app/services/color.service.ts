import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../responses/api.response';

export interface ColorDTO {
    name: string;
    code?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ColorService {
    private apiBaseUrl = `${environment.apiBaseUrl}/colors`;

    constructor(private http: HttpClient) { }

    // Lấy tất cả colors
    getAllColors(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(this.apiBaseUrl);
    }

    // Lấy chi tiết color
    getColorById(id: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiBaseUrl}/${id}`);
    }

    // Tạo color mới
    createColor(colorDTO: ColorDTO): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(this.apiBaseUrl, colorDTO);
    }

    // Cập nhật color
    updateColor(id: number, colorDTO: ColorDTO): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.apiBaseUrl}/${id}`, colorDTO);
    }

    // Xóa color
    deleteColor(id: number): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(`${this.apiBaseUrl}/${id}`);
    }
}
