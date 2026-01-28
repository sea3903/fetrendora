import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../responses/api.response';

export interface Coupon {
  id?: number;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  discount_type: 'FIXED' | 'PERCENT';
  discount_value: number;
  max_discount_amount?: number;
  min_order_value?: number;
  start_date?: string | any;
  end_date?: string | any;
  usage_limit?: number;
  usage_limit_per_user?: number;
  // Flat IDs (for form binding)
  category_id?: number | null;
  product_id?: number | null;
  // Nested objects (from API response)
  category?: { id: number; name?: string } | null;
  product?: { id: number; name?: string; price?: number } | null;
  // Helper fields for UI
  scope?: 'global' | 'category' | 'product';
  // Parsed dates for display (Date objects for Angular pipe)
  startDateParsed?: Date | null;
  endDateParsed?: Date | null;
  // Names for display
  categoryName?: string;
  productName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CouponService {

  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  calculateCouponValue(couponCode: string, totalAmount: number): Observable<ApiResponse> {
    const url = `${this.apiBaseUrl}/coupons/calculate`;
    const params = new HttpParams()
      .set('couponCode', couponCode)
      .set('totalAmount', totalAmount.toString());

    return this.http.get<ApiResponse>(url, { params });
  }

  getCoupons(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiBaseUrl}/coupons`);
  }

  getCouponById(id: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiBaseUrl}/coupons/${id}`);
  }

  createCoupon(coupon: Coupon): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiBaseUrl}/coupons`, coupon);
  }

  updateCoupon(id: number, coupon: Coupon): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiBaseUrl}/coupons/${id}`, coupon);
  }

  deleteCoupon(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiBaseUrl}/coupons/${id}`);
  }

}