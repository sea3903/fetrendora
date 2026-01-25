import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { OrderDTO } from '../../../dtos/order/order.dto';
import { OrderResponse } from '../../../responses/order/order.response';
import { ApiResponse } from '../../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../../base/base.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-detail-order-admin',
  templateUrl: './detail.order.admin.component.html',
  styleUrls: ['./detail.order.admin.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
  ]
})

export class DetailOrderAdminComponent extends BaseComponent implements OnInit {
  orderId: number = 0;
  orderResponse: OrderResponse = {
    id: 0,
    user_id: 0,
    fullname: '',
    phone_number: '',
    email: '',
    address: '',
    note: '',
    order_date: new Date(),
    status: '',
    total_money: 0,
    shipping_method: '',
    shipping_address: '',
    shipping_date: new Date(),
    payment_method: '',
    order_details: [],
  };

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.getOrderDetails();
  }

  getOrderDetails(): void {
    this.orderId = Number(this.activatedRoute.snapshot.paramMap.get('id'));
    this.orderService.getOrderById(this.orderId).subscribe({
      next: (apiResponse: ApiResponse) => {
        const response = apiResponse.data
        this.orderResponse.id = response.id;
        this.orderResponse.user_id = response.user_id;
        this.orderResponse.fullname = response.fullname;
        this.orderResponse.email = response.email;
        this.orderResponse.phone_number = response.phone_number;
        this.orderResponse.address = response.address;
        this.orderResponse.note = response.note;
        this.orderResponse.total_money = response.total_money;
        if (response.order_date) {
          this.orderResponse.order_date = new Date(
            response.order_date[0],
            response.order_date[1] - 1,
            response.order_date[2]
          );
        }

        // Flatten order details to ensure template can access properties directly
        // The backend might return 'product' object inside order_detail or flattened fields.
        // We handle both cases to be safe.
        this.orderResponse.order_details = response.order_details
          .map((order_detail: any) => {
            const productThumbnail = order_detail.product ? order_detail.product.thumbnail : order_detail.thumbnail;
            const thumbnail = `${environment.apiBaseUrl}/products/images/${productThumbnail}`;

            return {
              id: order_detail.id,
              order_id: order_detail.order_id,
              product_id: order_detail.product_id || (order_detail.product ? order_detail.product.id : 0),
              product_name: order_detail.product_name || (order_detail.product ? order_detail.product.name : ''),
              thumbnail: thumbnail, // Normalized thumbnail path
              price: order_detail.price,
              number_of_products: order_detail.numberOfProducts || order_detail.number_of_products,
              total_money: order_detail.total_money,
              color: order_detail.color
            };
          });

        this.orderResponse.payment_method = response.payment_method;
        if (response.shipping_date) {
          this.orderResponse.shipping_date = new Date(
            response.shipping_date[0],
            response.shipping_date[1] - 1,
            response.shipping_date[2]
          );
        }
        this.orderResponse.shipping_method = response.shipping_method;
        this.orderResponse.status = response.status;
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Lỗi tải chi tiết đơn hàng',
          title: 'Lỗi Đơn Hàng'
        });
      }
    });
  }

  // Cập nhật thông tin chung (trừ status)
  saveOrderInfo(): void {
    this.orderService
      .updateOrder(this.orderId, new OrderDTO(this.orderResponse))
      .subscribe({
        next: (response: ApiResponse) => {
          this.toastService.showToast({
            error: null,
            defaultMsg: 'Cập nhật thông tin thành công',
            title: 'Thành Công'
          });
          this.getOrderDetails(); // Reload data
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.showToast({
            error: error,
            defaultMsg: 'Lỗi cập nhật đơn hàng',
            title: 'Lỗi Hệ Thống'
          });
        }
      });
  }

  // Cập nhật riêng trạng thái đơn hàng (Logic quan trọng để hoàn kho)
  updateStatus(): void {
    if (!this.orderResponse.status) return;

    this.orderService.updateOrderStatus(this.orderId, this.orderResponse.status).subscribe({
      next: (response: ApiResponse) => {
        this.toastService.showToast({
          error: null,
          defaultMsg: 'Cập nhật trạng thái thành công',
          title: 'Thành Công'
        });
        this.getOrderDetails(); // Reload data to sync potential backend changes
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Lỗi cập nhật trạng thái',
          title: 'Lỗi'
        });
      }
    });
  }

  onStatusChange() {
    // Có thể thêm logic cảnh báo nếu cần
  }

  goBack() {
    this.router.navigate(['/admin/orders']);
  }
}