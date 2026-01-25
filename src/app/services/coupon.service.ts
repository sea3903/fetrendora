import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../responses/api.response';

export interface CouponCondition {
  id?: number;
  attribute: string;
  operator: string;
  value: string;
  discount_amount: number;
}

export interface Coupon {
  id?: number;
  code: string;
  active: boolean;
  conditions?: CouponCondition[];
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