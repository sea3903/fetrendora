import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product } from '../../models/product';
import { environment } from '../../../environments/environment';
import { OrderDTO } from '../../dtos/order/order.dto';
import { ApiResponse } from '../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../base/base.component';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CartItem } from '../../services/cart.service';
import { UserResponse } from '../../responses/user/user.response';

interface CheckoutItem {
    product: Product;
    quantity: number;
}

@Component({
    selector: 'app-checkout',
    templateUrl: './checkout.component.html',
    styleUrls: ['./checkout.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        HeaderComponent,
        FooterComponent
    ]
})
export class CheckoutComponent extends BaseComponent implements OnInit {
    private formBuilder = inject(FormBuilder);

    checkoutForm!: FormGroup;
    checkoutItems: CheckoutItem[] = [];

    totalAmount: number = 0;
    discountAmount: number = 0;
    finalAmount: number = 0;

    couponCode: string = '';
    couponApplied: boolean = false;

    isSubmitting: boolean = false;
    userResponse?: UserResponse | null;

    constructor() {
        super();
        this.initForm();
    }

    ngOnInit(): void {
        // Lấy thông tin user
        this.loadUserInfo();
        // Lấy selected items từ cart
        this.loadCheckoutItems();
    }

    // Khởi tạo form
    initForm(): void {
        this.checkoutForm = this.formBuilder.group({
            fullname: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            phone_number: ['', [Validators.required, Validators.minLength(10)]],
            address: ['', [Validators.required, Validators.minLength(5)]],
            note: [''],
            shipping_method: ['express'],
            payment_method: ['cod'] // Mặc định COD
        });
    }

    // Load thông tin user và pre-fill form
    loadUserInfo(): void {
        this.userResponse = this.userService.getUserResponseFromLocalStorage();

        if (this.userResponse) {
            this.checkoutForm.patchValue({
                fullname: this.userResponse.fullname || '',
                email: this.userResponse.email || '',
                phone_number: this.userResponse.phone_number || '',
                address: this.userResponse.address || ''
            });
        }
    }

    // Load selected items từ cart
    loadCheckoutItems(): void {
        const selectedItems = this.cartService.getSelectedItems();

        if (selectedItems.length === 0) {
            // Nếu không có items được chọn, quay lại cart
            this.router.navigate(['/cart']);
            return;
        }

        const productIds = selectedItems.map(item => item.productId);

        this.productService.getProductsByIds(productIds).subscribe({
            next: (apiResponse: ApiResponse) => {
                const products: Product[] = apiResponse.data || [];

                this.checkoutItems = selectedItems.map(cartItem => {
                    const product = products.find(p => p.id === cartItem.productId);
                    if (product) {
                        product.thumbnail = `${environment.apiBaseUrl}/products/images/${product.thumbnail}`;
                    }
                    return {
                        product: product!,
                        quantity: cartItem.quantity
                    };
                }).filter(item => item.product);

                this.calculateTotal();
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error loading checkout items:', error);
                this.toastService.showToast({
                    error: error,
                    defaultMsg: 'Lỗi tải thông tin đơn hàng',
                    title: 'Lỗi'
                });
            }
        });
    }

    // Tính tổng tiền
    calculateTotal(): void {
        this.totalAmount = this.checkoutItems.reduce(
            (total, item) => total + item.product.price * item.quantity,
            0
        );
        this.finalAmount = this.totalAmount - this.discountAmount;
    }

    // Áp dụng mã giảm giá
    applyCoupon(): void {
        if (!this.couponCode || this.couponApplied) return;

        this.couponService.calculateCouponValue(this.couponCode, this.totalAmount)
            .subscribe({
                next: (apiResponse: ApiResponse) => {
                    this.finalAmount = apiResponse.data;
                    this.discountAmount = this.totalAmount - this.finalAmount;
                    this.couponApplied = true;
                    this.toastService.showToast({
                        error: null,
                        defaultMsg: 'Áp dụng mã giảm giá thành công!',
                        title: 'Thành công'
                    });
                },
                error: (error: HttpErrorResponse) => {
                    this.toastService.showToast({
                        error: error,
                        defaultMsg: 'Mã giảm giá không hợp lệ',
                        title: 'Lỗi'
                    });
                }
            });
    }

    // Đặt hàng
    placeOrder(): void {
        if (this.checkoutForm.invalid) {
            this.checkoutForm.markAllAsTouched();
            this.toastService.showToast({
                error: 'Vui lòng điền đầy đủ thông tin',
                defaultMsg: 'Vui lòng điền đầy đủ thông tin',
                title: 'Lỗi'
            });
            return;
        }

        this.isSubmitting = true;

        const orderData: OrderDTO = {
            user_id: this.tokenService.getUserId(),
            ...this.checkoutForm.value,
            status: 'pending',
            total_money: this.finalAmount,
            coupon_code: this.couponApplied ? this.couponCode : '',
            cart_items: this.checkoutItems.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity
            }))
        };

        const paymentMethod = this.checkoutForm.get('payment_method')?.value;

        if (paymentMethod === 'vnpay') {
            this.processVNPayOrder(orderData);
        } else {
            this.processCODOrder(orderData);
        }
    }

    // Xử lý đơn hàng COD
    private processCODOrder(orderData: OrderDTO): void {
        this.orderService.placeOrder(orderData).subscribe({
            next: (response: ApiResponse) => {
                this.isSubmitting = false;
                // Xóa các items đã checkout khỏi cart
                this.cartService.clearSelectedItems();

                this.toastService.showToast({
                    error: null,
                    defaultMsg: 'Đặt hàng thành công!',
                    title: 'Thành công'
                });

                // Chuyển đến trang orders
                this.router.navigate(['/orders']);
            },
            error: (error: HttpErrorResponse) => {
                this.isSubmitting = false;
                this.toastService.showToast({
                    error: error,
                    defaultMsg: 'Lỗi đặt hàng',
                    title: 'Lỗi'
                });
            }
        });
    }

    // Xử lý đơn hàng VNPay
    private processVNPayOrder(orderData: OrderDTO): void {
        // Bước 1: Tạo link thanh toán VNPay
        this.paymentService.createPaymentUrl({
            amount: this.finalAmount,
            language: 'vn'
        }).subscribe({
            next: (res: ApiResponse) => {
                const paymentUrl = res.data;
                const vnp_TxnRef = new URL(paymentUrl).searchParams.get('vnp_TxnRef') || '';

                // Bước 2: Tạo đơn hàng với vnp_txn_ref
                this.orderService.placeOrder({
                    ...orderData,
                    vnp_txn_ref: vnp_TxnRef
                }).subscribe({
                    next: () => {
                        // Xóa các items đã checkout khỏi cart
                        this.cartService.clearSelectedItems();
                        // Redirect đến VNPay
                        window.location.href = paymentUrl;
                    },
                    error: (error: HttpErrorResponse) => {
                        this.isSubmitting = false;
                        this.toastService.showToast({
                            error: error,
                            defaultMsg: 'Lỗi tạo đơn hàng',
                            title: 'Lỗi'
                        });
                    }
                });
            },
            error: (error: HttpErrorResponse) => {
                this.isSubmitting = false;
                this.toastService.showToast({
                    error: error,
                    defaultMsg: 'Lỗi kết nối cổng thanh toán',
                    title: 'Lỗi'
                });
            }
        });
    }

    // Quay lại trang cart
    goBack(): void {
        this.router.navigate(['/cart']);
    }
}
