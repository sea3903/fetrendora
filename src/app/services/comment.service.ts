import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../responses/api.response';

@Injectable({
    providedIn: 'root'
})
export class CommentService {
    private apiBaseUrl = environment.apiBaseUrl;
    private http = inject(HttpClient);

    // ══════════════════════════════════════════════
    // API CHO TRANG CHI TIẾT SẢN PHẨM (PUBLIC)
    // ══════════════════════════════════════════════

    /**
     * Lấy đánh giá theo sản phẩm
     */
    getCommentsByProduct(productId: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(
            `${this.apiBaseUrl}/comments?product_id=${productId}`
        );
    }

    /**
     * Lấy đánh giá theo user và sản phẩm
     */
    getCommentsByUserAndProduct(userId: number, productId: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(
            `${this.apiBaseUrl}/comments?user_id=${userId}&product_id=${productId}`
        );
    }

    // ══════════════════════════════════════════════
    // API CHO USER ĐÃ ĐĂNG NHẬP
    // ══════════════════════════════════════════════

    /**
     * Thêm đánh giá mới
     */
    addComment(productId: number, userId: number, content: string, rating: number): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.apiBaseUrl}/comments`, {
            product_id: productId,
            user_id: userId,
            content: content,
            rating: rating
        });
    }

    /**
     * Cập nhật đánh giá (user)
     */
    updateComment(commentId: number, content: string, rating: number): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.apiBaseUrl}/comments/${commentId}`, {
            content: content,
            rating: rating
        });
    }

    /**
     * Kiểm tra quyền đánh giá
     */
    canReview(productId: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(
            `${this.apiBaseUrl}/comments/can-review?product_id=${productId}`
        );
    }

    /**
     * Lấy đánh giá của tôi (phân trang)
     */
    getMyReviews(page: number = 0, limit: number = 10): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(
            `${this.apiBaseUrl}/comments/my-reviews?page=${page}&limit=${limit}`
        );
    }

    /**
     * User xóa đánh giá của chính mình
     */
    deleteMyComment(commentId: number): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(
            `${this.apiBaseUrl}/comments/user/${commentId}`
        );
    }

    // ══════════════════════════════════════════════
    // API CHO ADMIN
    // ══════════════════════════════════════════════

    /**
     * Admin: Lấy danh sách đánh giá với bộ lọc nâng cao
     */
    getCommentsAdmin(
        keyword: string = '',
        page: number = 0,
        limit: number = 10,
        productId?: number,
        rating?: number,
        startDate?: string,
        endDate?: string
    ): Observable<ApiResponse> {
        let params = new HttpParams()
            .set('keyword', keyword)
            .set('page', page.toString())
            .set('limit', limit.toString());

        if (productId) params = params.set('productId', productId.toString());
        if (rating) params = params.set('rating', rating.toString());
        if (startDate) params = params.set('startDate', startDate);
        if (endDate) params = params.set('endDate', endDate);

        return this.http.get<ApiResponse>(`${this.apiBaseUrl}/comments/admin`, { params });
    }

    /**
     * Admin: Lấy chi tiết đánh giá
     */
    getCommentDetail(commentId: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(
            `${this.apiBaseUrl}/comments/admin/${commentId}`
        );
    }

    /**
     * Admin: Cập nhật đánh giá
     */
    adminUpdateComment(commentId: number, content: string, rating: number): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.apiBaseUrl}/comments/admin/${commentId}`, {
            content: content,
            rating: rating
        });
    }

    /**
     * Admin: Xóa đánh giá
     */
    deleteComment(commentId: number): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(
            `${this.apiBaseUrl}/comments/${commentId}`
        );
    }

    /**
     * Admin: Lấy thống kê đánh giá
     */
    getCommentStatistics(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(
            `${this.apiBaseUrl}/comments/admin/statistics`
        );
    }

    /**
     * Admin: Tạo dữ liệu đánh giá giả
     */
    generateFakeComments(): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(
            `${this.apiBaseUrl}/comments/generateFakeComments`, {}
        );
    }
}
