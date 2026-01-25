import { Component, OnInit, Inject } from '@angular/core';
import { OrderResponse } from '../../../responses/order/order.response';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiResponse } from '../../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../../base/base.component';

@Component({
  selector: 'app-order-admin',
  templateUrl: './order.admin.component.html',
  styleUrls: ['./order.admin.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
  ]
})
export class OrderAdminComponent extends BaseComponent implements OnInit {
  orders: OrderResponse[] = [];
  currentPage: number = 0;
  itemsPerPage: number = 12;
  pages: number[] = [];
  totalPages: number = 0;
  keyword: string = "";
  visiblePages: number[] = [];
  localStorage?: Storage;

  constructor() {
    super();
    this.localStorage = document.defaultView?.localStorage;
  }

  ngOnInit(): void {
    debugger
    this.currentPage = Number(this.localStorage?.getItem('currentOrderAdminPage')) || 0;
    this.getAllOrders(this.keyword, this.currentPage, this.itemsPerPage);
  }
  searchOrders() {
    this.currentPage = 0;
    this.itemsPerPage = 12;
    //Mediocre Iron Wallet
    debugger
    this.getAllOrders(this.keyword.trim(), this.currentPage, this.itemsPerPage);
  }
  getAllOrders(keyword: string, page: number, limit: number) {
    debugger
    this.orderService.getAllOrders(keyword, page, limit).subscribe({
      next: (apiResponse: ApiResponse) => {
        debugger
        this.orders = apiResponse.data.orders;
        this.totalPages = apiResponse.data.totalPages;
        this.visiblePages = this.generateVisiblePageArray(this.currentPage, this.totalPages);
      },
      complete: () => {
        debugger;
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Lỗi tải danh sách đơn hàng',
          title: 'Lỗi Tải Dữ Liệu'
        });
      }
    });
  }
  onPageChange(page: number) {
    debugger;
    this.currentPage = page < 0 ? 0 : page;
    this.localStorage?.setItem('currentOrderAdminPage', String(this.currentPage));
    this.getAllOrders(this.keyword, this.currentPage, this.itemsPerPage);
  }


  deleteOrder(id: number) {
    const confirmation = window
      .confirm('Bạn có chắc chắn muốn xóa đơn hàng này?'); // Vietnamese text
    if (confirmation) {
      this.orderService.deleteOrder(id).subscribe({
        next: (response: ApiResponse) => {
          this.toastService.showToast({
            error: null,
            defaultMsg: 'Xóa đơn hàng thành công',
            title: 'Thành Công'
          });
          // Reload current page instead of full location reload for better UX? 
          // location.reload(); -> Better to re-fetch
          this.getAllOrders(this.keyword, this.currentPage, this.itemsPerPage);
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.showToast({
            error: error,
            defaultMsg: 'Lỗi khi xóa đơn hàng',
            title: 'Lỗi Xóa'
          });
        }
      });
    }
  }

  // Thêm hàm hủy đơn hàng riêng biệt
  cancelOrder(id: number) {
    const confirmation = window.confirm('Bạn có chắc chắn muốn HỦY đơn hàng này? Kho hàng sẽ được hoàn lại.');
    if (confirmation) {
      this.orderService.updateOrderStatus(id, 'cancelled').subscribe({
        next: (response: ApiResponse) => {
          this.toastService.showToast({
            error: null,
            defaultMsg: 'Hủy đơn hàng thành công. Đã hoàn kho.',
            title: 'Thành Công'
          });
          this.getAllOrders(this.keyword, this.currentPage, this.itemsPerPage);
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.showToast({
            error: error,
            defaultMsg: 'Lỗi khi hủy đơn hàng',
            title: 'Lỗi Hủy'
          });
        }
      });
    }
  }
  viewDetails(order: OrderResponse) {
    debugger
    this.router.navigate(['/admin/orders', order.id]);
  }

}