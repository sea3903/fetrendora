import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '../components/base/base.component';
import { ApiResponse } from '../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-payment-callback',
  templateUrl: './payment-callback.component.html', // Tách riêng HTML
  styleUrls: ['./payment-callback.component.scss']
})
export class PaymentCallbackComponent extends BaseComponent implements OnInit { // Kế thừa BaseComponent
  loading: boolean = true;
  paymentSuccess: boolean = false;

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      const vnp_ResponseCode = params['vnp_ResponseCode'];
      const vnp_TxnRef = params['vnp_TxnRef'];

      if (vnp_ResponseCode && vnp_TxnRef) {
        const orderId: number = Number(vnp_TxnRef);

        // Xóa query params khỏi URL ngay lập tức để người dùng không thấy
        window.history.replaceState({}, document.title, window.location.pathname);

        if (vnp_ResponseCode === '00') {
          this.handlePaymentSuccess(orderId);
        } else {
          this.handlePaymentFailure();
        }
      }
    });
  }

  handlePaymentSuccess(orderId: number): void {
    // Sử dụng this.orderService từ BaseComponent
    this.orderService.updateOrderStatus(orderId, 'shipped').subscribe({
      next: (response: ApiResponse) => {
        this.loading = false;
        this.paymentSuccess = true;
        // Sử dụng this.toastService từ BaseComponent
        this.toastService.showToast({
          error: null,
          defaultMsg: 'Thanh toán thành công!',
          title: 'Thành Công'
        });
        // Sử dụng this.router từ BaseComponent để chuyển hướng
        setTimeout(() => {
          this.cartService.clearCart();
          this.router.navigate(['/my-orders']);
        }, 3000);
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.paymentSuccess = false;
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Lỗi khi cập nhật trạng thái đơn hàng',
          title: 'Lỗi'
        });
      }
    });
  }

  handlePaymentFailure(): void {
    this.loading = false;
    this.paymentSuccess = false;
    this.toastService.showToast({
      error: null,
      defaultMsg: 'Thanh toán thất bại. Vui lòng thử lại.',
      title: 'Lỗi'
    });
    // Chuyển hướng về trang thanh toán hoặc trang chủ
    setTimeout(() => {
      this.router.navigate(['/checkout']);
    }, 3000);
  }
}