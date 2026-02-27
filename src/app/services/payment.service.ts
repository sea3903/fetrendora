import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../responses/api.response';
import { CreatePaymentDTO } from '../dtos/payment/create.payment.dto';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  /** 
   * POST /payments/create_payment_url
   * Truyền vào một CreatePaymentDTO để tạo link thanh toán.
   */
  createPaymentUrl(paymentData: CreatePaymentDTO): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiBaseUrl}/payments/create_payment_url`,
      paymentData
    );
  }

  // ===== SEPAY - Thanh toán QR chuyển khoản =====

  createSepayQr(data: { amount: number, orderCode: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiBaseUrl}/payments/sepay/create-qr`,
      data
    );
  }

  checkSepayStatus(orderCode: string, amount: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(
      `${this.apiBaseUrl}/payments/sepay/check-status?orderCode=${orderCode}&amount=${amount}`
    );
  }
}
