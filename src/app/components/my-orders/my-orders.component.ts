import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { TokenService } from '../../services/token.service';
import { ApiResponse } from '../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderResponse } from '../../responses/order/order.response';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ToastService } from '../../services/toast.service';
import { OrderDetailResponse } from '../../responses/order/order-detail.response';

@Component({
    selector: 'app-my-orders',
    standalone: true,
    imports: [CommonModule, RouterModule, HeaderComponent, FooterComponent],
    templateUrl: './my-orders.component.html',
    styleUrls: ['./my-orders.component.scss']
})
export class MyOrdersComponent implements OnInit {
    orders: OrderResponse[] = [];
    isLoading: boolean = false;

    private orderService = inject(OrderService);
    private tokenService = inject(TokenService);
    private router = inject(Router);
    private toastService = inject(ToastService);

    ngOnInit(): void {
        this.loadOrders();
    }

    loadOrders(): void {
        const userId = this.tokenService.getUserId();
        if (!userId) {
            this.router.navigate(['/login']);
            return;
        }

        this.isLoading = true;
        this.orderService.getOrdersByUserId(userId).subscribe({
            next: (response: ApiResponse) => {
                // Map data và đảm bảo thumbnail có URL đầy đủ
                const ordersData = response.data as OrderResponse[];
                this.orders = ordersData.map(order => {
                    // Xử lý order details
                    if (order.order_details) {
                        order.order_details = order.order_details.map(detail => {
                            if (detail.thumbnail && !detail.thumbnail.startsWith('http')) {
                                // Giả định backend trả về tên file ảnh
                                // Nếu cần xử lý url ảnh giống cart:
                                // detail.thumbnail = `${environment.apiBaseUrl}/products/images/${detail.thumbnail}`;
                            }
                            return detail;
                        });
                    }
                    return order;
                });

                // Sắp xếp đơn mới nhất lên đầu
                this.orders.sort((a, b) => {
                    // Check nếu order_date là string hay Date obj
                    const dateA = new Date(a.order_date).getTime();
                    const dateB = new Date(b.order_date).getTime();
                    return dateB - dateA;
                });

                this.isLoading = false;
            },
            error: (error: HttpErrorResponse) => {
                this.isLoading = false;
                console.error('Error loading orders:', error);
                this.toastService.showToast({
                    error: error,
                    defaultMsg: 'Không thể tải lịch sử đơn hàng',
                    title: 'Lỗi tải dữ liệu'
                });
            }
        });
    }

    getStatusClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'pending': return 'status-pending';
            case 'processing': return 'status-processing';
            case 'shipped': return 'status-shipped';
            case 'delivered': return 'status-delivered';
            case 'cancelled': return 'status-cancelled';
            default: return '';
        }
    }

    getStatusText(status: string): string {
        switch (status.toLowerCase()) {
            case 'pending': return 'Chờ xử lý';
            case 'processing': return 'Đang xử lý';
            case 'shipped': return 'Đang giao hàng';
            case 'delivered': return 'Đã giao hàng';
            case 'cancelled': return 'Đã hủy';
            default: return status;
        }
    }
}
