import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { PaymentService } from '../../services/payment.service';
import { OrderService } from '../../services/order.service';
import { ApiResponse } from '../../responses/api.response';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CartService } from '../../services/cart.service';

@Component({
    selector: 'app-sepay-payment',
    templateUrl: './sepay-payment.component.html',
    styleUrls: ['./sepay-payment.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        HeaderComponent,
        FooterComponent,
        CurrencyPipe
    ]
})
export class SepayPaymentComponent implements OnInit, OnDestroy {
    qrUrl: string = '';
    orderCode: string = '';
    amount: number = 0;
    content: string = '';
    bankCode: string = '';
    bankAccount: string = '';
    accountName: string = '';

    loading: boolean = true;
    paymentSuccess: boolean = false;
    paymentExpired: boolean = false;
    timeLeft: number = 15 * 60; // 15 phút (giây)
    formattedTime: string = '15:00';

    private pollingSubscription?: Subscription;
    private timerSubscription?: Subscription;
    private isBrowser: boolean;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private paymentService: PaymentService,
        private orderService: OrderService,
        private cartService: CartService,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            this.orderCode = params['orderCode'] || '';
            this.amount = Number(params['amount']) || 0;
            this.qrUrl = params['qrUrl'] || '';
            this.content = params['content'] || '';
            this.bankCode = params['bankCode'] || '';
            this.bankAccount = params['bankAccount'] || '';
            this.accountName = params['accountName'] || '';

            if (!this.orderCode || !this.amount) {
                this.router.navigate(['/checkout']);
                return;
            }

            this.loading = false;

            // Bắt đầu đếm ngược và polling
            if (this.isBrowser) {
                this.startTimer();
                this.startPolling();
            }
        });
    }

    ngOnDestroy(): void {
        this.pollingSubscription?.unsubscribe();
        this.timerSubscription?.unsubscribe();
    }

    // Đếm ngược 15 phút
    startTimer(): void {
        this.timerSubscription = interval(1000).subscribe(() => {
            this.timeLeft--;
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            this.formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (this.timeLeft <= 0) {
                this.paymentExpired = true;
                this.timerSubscription?.unsubscribe();
                this.pollingSubscription?.unsubscribe();

                // Tự động hủy đơn hàng khi hết hạn thanh toán → hoàn trả tồn kho
                const orderId = Number(this.orderCode);
                if (orderId > 0) {
                    this.orderService.cancelOrder(orderId).subscribe({
                        next: () => {
                            console.log('[SePay] Đã tự động hủy đơn hàng hết hạn:', orderId);
                        },
                        error: (err) => {
                            console.error('[SePay] Lỗi hủy đơn hàng hết hạn:', err);
                        }
                    });
                }
            }
        });
    }

    // Polling kiểm tra thanh toán mỗi 5 giây
    startPolling(): void {
        this.pollingSubscription = interval(5000).pipe(
            takeWhile(() => !this.paymentSuccess && !this.paymentExpired),
            switchMap(() => this.paymentService.checkSepayStatus(this.orderCode, this.amount))
        ).subscribe({
            next: (response: ApiResponse) => {
                console.log('[SePay Polling] Response:', response);
                if (response.data?.success === true) {
                    this.paymentSuccess = true;
                    this.pollingSubscription?.unsubscribe();
                    this.timerSubscription?.unsubscribe();

                    // Cập nhật trạng thái đơn hàng
                    const orderId = Number(this.orderCode);
                    this.orderService.updateOrderStatus(orderId, 'processing').subscribe({
                        next: () => {
                            this.cartService.clearSelectedItems();
                            setTimeout(() => {
                                this.router.navigate(['/my-orders']);
                            }, 3000);
                        },
                        error: () => {
                            // Vẫn chuyển hướng dù lỗi update status
                            setTimeout(() => {
                                this.router.navigate(['/my-orders']);
                            }, 3000);
                        }
                    });
                } else if (response.data?.error) {
                    console.error('[SePay Polling] Lỗi từ backend:', response.data.error);
                }
            },
            error: (err) => {
                console.error('[SePay Polling] Lỗi HTTP:', err.status, err.message);
                // Nếu lỗi 429 (rate limit) hoặc 500, giảm tần suất hoặc log
                if (err.status === 429) {
                    console.warn('[SePay Polling] Rate limited! Sẽ thử lại sau...');
                }
            }
        });
    }

    // Copy nội dung chuyển khoản
    copyContent(): void {
        if (this.isBrowser) {
            navigator.clipboard.writeText(this.content).then(() => {
                // Có thể show toast
            });
        }
    }

    // Quay lại
    goBack(): void {
        this.router.navigate(['/checkout']);
    }
}
