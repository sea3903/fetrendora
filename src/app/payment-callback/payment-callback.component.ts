import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { BaseComponent } from '../components/base/base.component';
import { ApiResponse } from '../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-payment-callback',
  templateUrl: './payment-callback.component.html',
  styleUrls: ['./payment-callback.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class PaymentCallbackComponent extends BaseComponent implements OnInit {
  loading: boolean = true;
  paymentSuccess: boolean = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    super();
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      const vnp_ResponseCode = params['vnp_ResponseCode'];
      const vnp_TxnRef = params['vnp_TxnRef'];

      if (vnp_ResponseCode && vnp_TxnRef) {
        const orderId: number = Number(vnp_TxnRef);

        // Xóa query params khỏi URL (chỉ chạy trên browser)
        if (isPlatformBrowser(this.platformId)) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (vnp_ResponseCode === '00') {
          this.handlePaymentSuccess(vnp_TxnRef);
        } else {
          this.handlePaymentFailure();
        }
      } else {
        // Người dùng truy cập trực tiếp không có params hợp lệ
        this.loading = false;
        this.paymentSuccess = false;
      }
    });
  }

  handlePaymentSuccess(vnp_TxnRef: string): void {
    const pendingOrderStr = sessionStorage.getItem('pendingOrder');

    if (pendingOrderStr) {
      const orderData = JSON.parse(pendingOrderStr);
      orderData.vnp_txn_ref = vnp_TxnRef;

      // Thực sự tạo đơn hàng bây giờ
      this.orderService.placeOrder(orderData).subscribe({
        next: (response: ApiResponse) => {
          this.loading = false;
          this.paymentSuccess = true;
          sessionStorage.removeItem('pendingOrder');

          const createdOrderId = response.data?.id;

          // Cập nhật trạng thái thành processing luôn vì đã trả tiền
          this.orderService.updateOrderStatus(createdOrderId, 'processing').subscribe({
            next: () => {
              this.showSuccessAndRedirect();
            },
            error: () => {
              this.showSuccessAndRedirect(); // Vẫn thành công
            }
          });
        },
        error: (error: HttpErrorResponse) => {
          this.loading = false;
          this.paymentSuccess = false; // Lỗi sinh đơn do network/logic
          this.toastService.showToast({
            error: error,
            defaultMsg: 'Lỗi tạo đơn hàng trên hệ thống!',
            title: 'Lỗi'
          });
        }
      });
    } else {
      // Logic dự phòng (F5 trang hoặc đã tạo đơn rồi)
      this.orderService.updateOrderStatus(Number(vnp_TxnRef), 'processing').subscribe({
        next: () => {
          this.loading = false;
          this.paymentSuccess = true;
          this.showSuccessAndRedirect();
        },
        error: () => {
          this.loading = false;
          this.paymentSuccess = true; // Thanh toán VNPAY đã successful nên vẫn báo success
          this.showSuccessAndRedirect();
        }
      });
    }
  }

  private showSuccessAndRedirect() {
    this.toastService.showToast({
      error: null,
      defaultMsg: 'Thanh toán thành công!',
      title: 'Thành Công'
    });
    setTimeout(() => {
      this.cartService.clearSelectedItems();
      this.router.navigate(['/my-orders']);
    }, 3000);
  }


  handlePaymentFailure(): void {
    this.loading = false;
    this.paymentSuccess = false;
    sessionStorage.removeItem('pendingOrder'); // Xóa giỏ hàng nháp

    this.toastService.showToast({
      error: null,
      defaultMsg: 'Thanh toán chưa hoàn tất. Bạn có thể đặt lại đơn hàng từ giỏ hàng.',
      title: 'Thông báo'
    });
    // Chuyển hướng về trang giỏ hàng/thanh toán để khách thử lại
    setTimeout(() => {
      this.router.navigate(['/cart']);
    }, 3000);
  }
}