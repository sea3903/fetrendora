import { Component, OnInit } from '@angular/core';
import { OrderResponse } from '../../responses/order/order.response';
import { environment } from '../../../environments/environment';
import { OrderDetail } from '../../models/order.detail';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiResponse } from '../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../base/base.component';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order.detail.component.html',
  styleUrls: ['./order.detail.component.scss'],
  imports: [FooterComponent, HeaderComponent, CommonModule, RouterModule]
})
export class OrderDetailComponent extends BaseComponent implements OnInit {
  orderResponse: OrderResponse | null = null;
  isCancelling = false;

  ngOnInit(): void {
    this.loadOrderDetails();
  }

  // ═══════════════════════════════════════════
  // TẢI DỮ LIỆU
  // ═══════════════════════════════════════════

  loadOrderDetails(): void {
    const orderId = Number(this.activatedRoute.snapshot.paramMap.get('id'));
    if (!orderId) return;

    this.orderService.getOrderById(orderId).subscribe({
      next: (apiResponse: ApiResponse) => {
        const data = apiResponse.data;

        // Parse ngày đặt hàng (order_date)
        let orderDate = new Date();
        if (Array.isArray(data.order_date)) {
          orderDate = new Date(data.order_date[0], data.order_date[1] - 1, data.order_date[2],
            data.order_date[3] || 0, data.order_date[4] || 0, data.order_date[5] || 0);
        } else if (data.order_date) {
          orderDate = new Date(data.order_date);
        }

        // Parse ngày giao hàng (shipping_date)
        let shippingDate = new Date();
        if (Array.isArray(data.shipping_date)) {
          shippingDate = new Date(data.shipping_date[0], data.shipping_date[1] - 1, data.shipping_date[2]);
        } else if (data.shipping_date) {
          shippingDate = new Date(data.shipping_date);
        }

        // Map URL ảnh cho từng sản phẩm
        const orderDetails = (data.order_details || []).map((detail: any) => {
          if (detail.thumbnail) {
            detail.thumbnail = `${environment.apiBaseUrl}/products/images/${detail.thumbnail}`;
          }
          return detail;
        });

        this.orderResponse = {
          ...data,
          order_date: orderDate,
          shipping_date: shippingDate,
          order_details: orderDetails
        };
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Không thể tải thông tin đơn hàng',
          title: 'Lỗi'
        });
      }
    });
  }

  // ═══════════════════════════════════════════
  // HỦY ĐƠN HÀNG
  // ═══════════════════════════════════════════

  get canCancel(): boolean {
    return this.orderResponse?.status?.toLowerCase() === 'pending';
  }

  cancelOrder(): void {
    if (!this.orderResponse || this.isCancelling) return;

    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;

    this.isCancelling = true;
    this.orderService.updateOrderStatus(this.orderResponse.id, 'cancelled').subscribe({
      next: () => {
        this.isCancelling = false;
        if (this.orderResponse) {
          this.orderResponse.status = 'cancelled';
        }
        this.toastService.showToast({
          error: null,
          defaultMsg: 'Hủy đơn hàng thành công',
          title: 'Thành công'
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isCancelling = false;
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Không thể hủy đơn hàng',
          title: 'Lỗi'
        });
      }
    });
  }

  // ═══════════════════════════════════════════
  // HIỂN THỊ
  // ═══════════════════════════════════════════

  hasSellingAttribute(attributes: string | undefined, attr: string): boolean {
    if (!attributes) return true;
    return attributes.toLowerCase().includes(attr.toLowerCase());
  }

  getStatusText(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending': return 'Chờ xử lý';
      case 'processing': return 'Đang xử lý';
      case 'shipped': return 'Đang giao hàng';
      case 'delivered': return 'Đã giao hàng';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'shipped': return 'status-shipped';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getPaymentMethodText(method: string): string {
    switch (method?.toLowerCase()) {
      case 'cod': return 'Thanh toán khi nhận hàng (COD)';
      case 'vnpay': return 'Thanh toán VNPay';
      default: return method;
    }
  }

  getShippingMethodText(method: string): string {
    switch (method?.toLowerCase()) {
      case 'express': return 'Giao hàng nhanh';
      case 'normal': return 'Giao hàng tiêu chuẩn';
      default: return method;
    }
  }

  goBack(): void {
    this.router.navigate(['/my-orders']);
  }
}
