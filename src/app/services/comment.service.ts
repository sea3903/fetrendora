import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../responses/api.response';

export interface CommentDTO {
    product_id: number;
    user_id: number;
    content: string;
}

@Injectable({
    providedIn: 'root'
})
export class CommentService {
    private apiBaseUrl = environment.apiBaseUrl;

    constructor(private http: HttpClient) { }

    /**
     * Lấy danh sách đánh giá theo sản phẩm
     */
    getCommentsByProductId(productId: number): Observable<ApiResponse> {
        const params = new HttpParams().set('product_id', productId.toString());
        return this.http.get<ApiResponse>(`${this.apiBaseUrl}/comments`, { params });
    }

    /**
     * Thêm đánh giá mới
     */
    addComment(commentDTO: CommentDTO): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.apiBaseUrl}/comments`, commentDTO);
    }

    /**
     * Cập nhật đánh giá
     */
    updateComment(commentId: number, commentDTO: CommentDTO): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.apiBaseUrl}/comments/${commentId}`, commentDTO);
    }
}
