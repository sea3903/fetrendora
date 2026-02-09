import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../responses/api.response';

export interface EventImage {
    id: number;
    image_url: string;
    image_type: string;
    display_order: number;
}

export interface Event {
    id: number;
    title: string;
    description: string;
    thumbnail_url: string;
    video_url?: string;
    show_coupons: boolean;
    is_active: boolean;
    start_date: string;
    end_date: string;
    images?: EventImage[];
    coupons?: any[];
}

@Injectable({
    providedIn: 'root'
})
export class EventService {
    private apiBaseUrl = `${environment.apiBaseUrl}/events`;

    constructor(private http: HttpClient) { }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    getHomeEvent(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiBaseUrl}/home`);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN - CRUD SỰ KIỆN
    // ═══════════════════════════════════════════════════════════════

    getAllEvents(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(this.apiBaseUrl);
    }

    getEventById(id: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiBaseUrl}/${id}`);
    }

    createEvent(event: any): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(this.apiBaseUrl, event);
    }

    updateEvent(id: number, event: any): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.apiBaseUrl}/${id}`, event);
    }

    deleteEvent(id: number): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(`${this.apiBaseUrl}/${id}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN - QUẢN LÝ ẢNH
    // ═══════════════════════════════════════════════════════════════

    uploadImage(eventId: number, file: File): Observable<ApiResponse> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<ApiResponse>(`${this.apiBaseUrl}/${eventId}/images/upload`, formData);
    }

    addImageUrl(eventId: number, imageUrl: string): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.apiBaseUrl}/${eventId}/images/url`, { image_url: imageUrl });
    }

    deleteImage(imageId: number): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(`${this.apiBaseUrl}/images/${imageId}`);
    }

    getEventImages(eventId: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiBaseUrl}/${eventId}/images`);
    }

    setThumbnail(eventId: number, imageId: number): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.apiBaseUrl}/${eventId}/thumbnail/${imageId}`, {});
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN - QUẢN LÝ COUPON
    // ═══════════════════════════════════════════════════════════════

    assignCoupons(eventId: number, couponIds: number[]): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.apiBaseUrl}/${eventId}/coupons`, { coupon_ids: couponIds });
    }

    getEventCoupons(eventId: number): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiBaseUrl}/${eventId}/coupons`);
    }

    getAllCoupons(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiBaseUrl}/coupons/all`);
    }
}

