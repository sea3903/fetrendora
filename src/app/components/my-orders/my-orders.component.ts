import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { TokenService } from '../../services/token.service';
import { CommentService } from '../../services/comment.service';
import { ApiResponse } from '../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderResponse } from '../../responses/order/order.response';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';

interface ReviewItem {
    productId: number;
    productName: string;
    thumbnail: string;
    rating: number;
    hoverRating: number;
    content: string;
    alreadyReviewed: boolean;
    submitting: boolean;
    submitted: boolean;
}

@Component({
    selector: 'app-my-orders',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, HeaderComponent, FooterComponent],
    templateUrl: './my-orders.component.html',
    styleUrls: ['./my-orders.component.scss']
})
export class MyOrdersComponent implements OnInit {
    orders: OrderResponse[] = [];
    isLoading: boolean = false;

    // Review Modal
    showReviewModal: boolean = false;
    reviewingOrder: OrderResponse | null = null;
    reviewItems: ReviewItem[] = [];
    loadingReviewStatus: boolean = false;

    private orderService = inject(OrderService);
    private tokenService = inject(TokenService);
    private commentService = inject(CommentService);
    private userService = inject(UserService);
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
                const ordersData = response.data as OrderResponse[];
                this.orders = ordersData.map(order => {
                    if (order.order_details) {
                        order.order_details = order.order_details.map(detail => {
                            return detail;
                        });
                    }
                    return order;
                });

                // Sắp xếp đơn mới nhất lên đầu
                this.orders.sort((a, b) => {
                    const dateA = new Date(a.order_date).getTime();
                    const dateB = new Date(b.order_date).getTime();
                    return dateB - dateA;
                });

                this.isLoading = false;
            },
            error: (error: HttpErrorResponse) => {
                this.isLoading = false;
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

    // ══════════════════════════════════════════════
    // REVIEW MODAL
    // ══════════════════════════════════════════════

    isDelivered(order: OrderResponse): boolean {
        return order.status?.toLowerCase() === 'delivered';
    }

    openReviewModal(order: OrderResponse): void {
        this.reviewingOrder = order;
        this.showReviewModal = true;
        this.loadingReviewStatus = true;
        document.body.style.overflow = 'hidden';

        // Build items từ order_details
        this.reviewItems = (order.order_details || []).map(detail => ({
            productId: detail.product_id || 0,
            productName: detail.product_name || 'Sản phẩm',
            thumbnail: detail.thumbnail
                ? 'http://localhost:8088/api/v1/products/images/' + detail.thumbnail
                : 'assets/images/product-placeholder.png',
            rating: 0,
            hoverRating: 0,
            content: '',
            alreadyReviewed: false,
            submitting: false,
            submitted: false
        }));

        // Check review status cho từng sản phẩm
        let completed = 0;
        const total = this.reviewItems.length;

        if (total === 0) {
            this.loadingReviewStatus = false;
            return;
        }

        this.reviewItems.forEach(item => {
            this.commentService.canReview(item.productId).subscribe({
                next: (res: ApiResponse) => {
                    item.alreadyReviewed = res.data?.hasReviewed || false;
                    completed++;
                    if (completed >= total) this.loadingReviewStatus = false;
                },
                error: () => {
                    completed++;
                    if (completed >= total) this.loadingReviewStatus = false;
                }
            });
        });
    }

    closeReviewModal(): void {
        this.showReviewModal = false;
        this.reviewingOrder = null;
        document.body.style.overflow = '';
    }

    setItemRating(item: ReviewItem, star: number): void {
        if (item.alreadyReviewed || item.submitted) return;
        item.rating = star;
    }

    setItemHover(item: ReviewItem, star: number): void {
        if (item.alreadyReviewed || item.submitted) return;
        item.hoverRating = star;
    }

    resetItemHover(item: ReviewItem): void {
        item.hoverRating = 0;
    }

    getRatingText(rating: number): string {
        switch (rating) {
            case 1: return 'Rất tệ';
            case 2: return 'Tệ';
            case 3: return 'Bình thường';
            case 4: return 'Tốt';
            case 5: return 'Rất tốt';
            default: return '';
        }
    }

    canSubmitItem(item: ReviewItem): boolean {
        return !item.alreadyReviewed && !item.submitted && !item.submitting
            && item.rating > 0 && item.content.trim().length >= 10;
    }

    submitReview(item: ReviewItem): void {
        if (!this.canSubmitItem(item)) return;

        // Validate
        if (item.content.trim().length < 10) {
            this.toastService.showToast({
                error: null,
                defaultMsg: 'Nội dung đánh giá phải có ít nhất 10 ký tự',
                title: 'Thông báo'
            });
            return;
        }

        if (item.rating === 0) {
            this.toastService.showToast({
                error: null,
                defaultMsg: 'Vui lòng chọn số sao đánh giá',
                title: 'Thông báo'
            });
            return;
        }

        const userId = this.tokenService.getUserId();
        if (!userId) return;

        item.submitting = true;
        this.commentService.addComment(
            item.productId, userId, item.content.trim(), item.rating
        ).subscribe({
            next: () => {
                item.submitting = false;
                item.submitted = true;
                item.alreadyReviewed = true;
                this.toastService.showToast({
                    error: null,
                    defaultMsg: `Đánh giá "${item.productName}" thành công!`,
                    title: 'Thành công'
                });
            },
            error: (error: HttpErrorResponse) => {
                item.submitting = false;
                const errorMsg = error.error?.message || 'Lỗi khi gửi đánh giá';
                this.toastService.showToast({
                    error: null,
                    defaultMsg: errorMsg,
                    title: 'Lỗi'
                });
            }
        });
    }

    get allReviewed(): boolean {
        return this.reviewItems.length > 0 && this.reviewItems.every(item => item.alreadyReviewed || item.submitted);
    }
}
