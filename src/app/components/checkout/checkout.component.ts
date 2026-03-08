import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Product } from '../../models/product';
import { environment } from '../../../environments/environment';
import { OrderDTO } from '../../dtos/order/order.dto';
import { ApiResponse } from '../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../base/base.component';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { UserResponse } from '../../responses/user/user.response';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface CheckoutItem {
    product: Product;
    quantity: number;
    productDetailId?: number; // ID biến thể để trừ tồn kho
    variantPrice?: number; // Lưu giá của biến thể
}

@Component({
    selector: 'app-checkout',
    templateUrl: './checkout.component.html',
    styleUrls: ['./checkout.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        HeaderComponent,
        FooterComponent,
        TranslateModule
    ]
})
export class CheckoutComponent extends BaseComponent implements OnInit {
    private translate = inject(TranslateService);

    // Form fields - giống user-profile (KHÔNG CÓ EMAIL)
    fullName: string = '';
    phoneNumber: string = '';
    address: string = '';
    note: string = '';
    shippingMethod: string = 'express';
    paymentMethod: string = 'cod';

    // Validation errors
    fullNameError: string = '';
    phoneError: string = '';
    addressError: string = '';

    // Checkout data
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
    }

    ngOnInit(): void {
        this.loadUserInfo();
        this.loadCheckoutItems();
    }

    // Load thông tin user và pre-fill form
    loadUserInfo(): void {
        this.userResponse = this.userService.getUserResponseFromLocalStorage();

        if (this.userResponse) {
            this.fullName = this.userResponse.fullname || '';
            this.phoneNumber = this.userResponse.phone_number || '';
            this.address = this.userResponse.address || '';
        }
    }

    // Load selected items từ cart
    loadCheckoutItems(): void {
        const selectedItems = this.cartService.getSelectedItems();

        if (selectedItems.length === 0) {
            this.router.navigate(['/cart']);
            return;
        }

        const productIds = selectedItems.map(item => item.productId);

        this.productService.getProductsByIds(productIds).subscribe({
            next: (apiResponse: ApiResponse) => {
                const products: Product[] = apiResponse.data || [];

                this.checkoutItems = selectedItems.map(cartItem => {
                    const productFound = products.find(p => p.id === cartItem.productId);
                    if (!productFound) return null;

                    // Tạo bản sao product để tránh nhấp nháy ảnh
                    const product = { ...productFound };
                    product.thumbnail = `${environment.apiBaseUrl}/products/images/${product.thumbnail}`;

                    // Ưu tiên 1: Lấy giá biến thể từ CartItem (đã lưu lúc add to cart)
                    // Ưu tiên 2: Tìm từ product_details (API trả về)
                    // Fallback: Dùng giá sản phẩm gốc (product.price)
                    let variantPrice: number | undefined = cartItem.variantPrice;
                    if (!variantPrice && cartItem.productDetailId && product.product_details) {
                        const matchedDetail = product.product_details.find((pd: any) => pd.id === cartItem.productDetailId);
                        if (matchedDetail && matchedDetail.price) {
                            variantPrice = matchedDetail.price;
                        }
                    }

                    return {
                        product: product,
                        quantity: cartItem.quantity,
                        productDetailId: cartItem.productDetailId,
                        variantPrice: variantPrice
                    };
                }).filter(item => item !== null) as CheckoutItem[];

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

    // ═══════════════════════════════════════════════════════════════
    // VALIDATION - Copy từ user-profile
    // ═══════════════════════════════════════════════════════════════

    validateFullName(): boolean {
        if (!this.fullName || this.fullName.trim() === '') {
            this.fullNameError = 'Họ và tên là bắt buộc';
            return false;
        }
        const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂẵếưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;
        if (!nameRegex.test(this.fullName.trim())) {
            this.fullNameError = 'Họ tên chỉ được chứa chữ cái và khoảng trắng';
            return false;
        }
        this.fullNameError = '';
        return true;
    }

    validatePhone(): boolean {
        if (!this.phoneNumber || this.phoneNumber.trim() === '') {
            this.phoneError = 'Số điện thoại là bắt buộc';
            return false;
        }
        const phone = this.phoneNumber.trim();
        const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            this.phoneError = 'Số điện thoại không hợp lệ (VD: 0912345678)';
            return false;
        }
        this.phoneError = '';
        return true;
    }

    validateAddress(): boolean {
        if (!this.address || this.address.trim() === '') {
            this.addressError = 'Địa chỉ giao hàng là bắt buộc';
            return false;
        }
        if (this.address.trim().length < 10) {
            this.addressError = 'Địa chỉ phải có ít nhất 10 ký tự';
            return false;
        }
        this.addressError = '';
        return true;
    }

    isFormValid(): boolean {
        return this.fullNameError === '' &&
            this.phoneError === '' &&
            this.addressError === '' &&
            this.fullName.trim() !== '' &&
            this.phoneNumber.trim() !== '' &&
            this.address.trim() !== '';
    }

    validateAll(): boolean {
        const isNameValid = this.validateFullName();
        const isPhoneValid = this.validatePhone();
        const isAddressValid = this.validateAddress();
        return isNameValid && isPhoneValid && isAddressValid;
    }

    // ═══════════════════════════════════════════════════════════════
    // TÍNH TOÁN
    // ═══════════════════════════════════════════════════════════════

    calculateTotal(): void {
        this.totalAmount = this.checkoutItems.reduce(
            (total, item) => {
                const itemPrice = item.variantPrice || item.product.price;
                return total + itemPrice * item.quantity;
            },
            0
        );
        this.finalAmount = this.totalAmount - this.discountAmount;
    }

    applyCoupon(): void {
        const code = this.couponCode.trim();
        if (!code || this.couponApplied) return;

        // Lấy userId để backend check giới hạn sử dụng per user
        const userId = this.tokenService.getUserId();

        const cartItemsData = this.checkoutItems.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            product_detail_id: item.productDetailId
        }));

        this.couponService.calculateCouponValue(code, this.totalAmount, userId, cartItemsData)
            .subscribe({
                next: (apiResponse: ApiResponse) => {
                    this.finalAmount = apiResponse.data;
                    this.discountAmount = this.totalAmount - this.finalAmount;

                    if (this.discountAmount > 0) {
                        this.couponApplied = true;
                        this.toastService.showToast({
                            error: null,
                            defaultMsg: 'Áp dụng mã giảm giá thành công!',
                            title: 'Thành công'
                        });
                    } else {
                        // Trường hợp mã đúng nhưng không áp dụng được (do điều kiện chưa thỏa)
                        this.couponApplied = false;
                        this.finalAmount = this.totalAmount;
                        this.discountAmount = 0;

                        this.toastService.showToast({
                            error: null,
                            defaultMsg: 'Mã giảm giá hợp lệ nhưng chưa đủ điều kiện áp dụng.',
                            title: 'Chưa đủ điều kiện'
                        });
                    }
                },
                error: (error: HttpErrorResponse) => {
                    this.couponApplied = false;
                    // Hiển thị message lỗi từ backend (bao gồm lỗi đã dùng hết lượt)
                    const errorMsg = error.error?.message || 'Mã giảm giá không hợp lệ';
                    this.toastService.showToast({
                        error: error,
                        defaultMsg: errorMsg,
                        title: 'Lỗi'
                    });
                }
            });
    }

    // ═══════════════════════════════════════════════════════════════
    // ĐẶT HÀNG
    // ═══════════════════════════════════════════════════════════════

    placeOrder(): void {
        if (!this.validateAll()) {
            this.toastService.showToast({
                error: 'Vui lòng điền đầy đủ thông tin hợp lệ',
                defaultMsg: 'Vui lòng điền đầy đủ thông tin hợp lệ',
                title: 'Lỗi'
            });
            return;
        }

        this.isSubmitting = true;

        const orderData: OrderDTO = {
            user_id: this.tokenService.getUserId(),
            fullname: this.fullName.trim(),
            email: this.userResponse?.email || '', // Lấy email từ user đã đăng nhập
            phone_number: this.phoneNumber.trim(),
            address: this.address.trim(),
            note: this.note.trim(),
            status: 'pending',
            total_money: this.finalAmount,
            payment_method: this.paymentMethod,
            shipping_method: this.shippingMethod,
            coupon_code: this.couponApplied ? this.couponCode : '',
            cart_items: this.checkoutItems.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                product_detail_id: item.productDetailId // ID biến thể để trừ tồn kho
            }))
        };

        if (this.paymentMethod === 'vnpay') {
            this.processVNPayOrder(orderData);
        } else if (this.paymentMethod === 'sepay') {
            this.processSepayOrder(orderData);
        } else {
            this.processCODOrder(orderData);
        }
    }

    // Xử lý đơn hàng COD
    private processCODOrder(orderData: OrderDTO): void {
        this.orderService.placeOrder(orderData).subscribe({
            next: (response: ApiResponse) => {
                this.isSubmitting = false;
                // CHỈ xóa cart SAU KHI đặt hàng THÀNH CÔNG
                this.cartService.clearSelectedItems();

                this.toastService.showToast({
                    error: null,
                    defaultMsg: 'Đặt hàng thành công!',
                    title: 'Thành công'
                });

                this.router.navigate(['/my-orders']);
            },
            error: (error: HttpErrorResponse) => {
                this.isSubmitting = false;
                // KHÔNG xóa cart khi đặt hàng thất bại
                this.toastService.showToast({
                    error: error,
                    defaultMsg: 'Lỗi đặt hàng. Vui lòng thử lại.',
                    title: 'Lỗi'
                });
            }
        });
    }

    // Xử lý đơn hàng VNPay
    private processVNPayOrder(orderData: OrderDTO): void {
        this.paymentService.createPaymentUrl({
            amount: this.finalAmount,
            language: 'vn'
        }).subscribe({
            next: (res: ApiResponse) => {
                const paymentUrl = res.data;
                const vnp_TxnRef = new URL(paymentUrl).searchParams.get('vnp_TxnRef') || '';

                // Lưu tạm đơn hàng vào Session Storage
                orderData.vnp_txn_ref = vnp_TxnRef;
                sessionStorage.setItem('pendingOrder', JSON.stringify(orderData));

                // Chuyển hướng VNPay
                window.location.href = paymentUrl;
            },
            error: (error: HttpErrorResponse) => {
                this.isSubmitting = false;
                this.toastService.showToast({
                    error: error,
                    defaultMsg: 'Lỗi kết nối cổng thanh toán. Vui lòng thử lại.',
                    title: 'Lỗi'
                });
            }
        });
    }

    // Xử lý đơn hàng SePay (QR Chuyển khoản)
    private processSepayOrder(orderData: OrderDTO): void {
        // Tạo mã order tạm để gửi cho SePay ghi nhận
        const tempOrderCode = Math.floor(Math.random() * 100000000).toString(); // Mã ngẫu nhiên

        this.paymentService.createSepayQr({
            amount: this.finalAmount,
            orderCode: tempOrderCode
        }).subscribe({
            next: (qrRes: ApiResponse) => {
                const qrData = qrRes.data;

                // Lưu tạm đơn hàng vào Session Storage
                sessionStorage.setItem('pendingOrder', JSON.stringify(orderData));

                // Chuyển hướng đến trang thanh toán QR kèm thông tin
                this.router.navigate(['/payments/sepay-payment'], {
                    queryParams: {
                        orderCode: qrData.orderCode,
                        amount: qrData.amount,
                        qrUrl: qrData.qrUrl,
                        content: qrData.content,
                        bankCode: qrData.bankCode,
                        bankAccount: qrData.bankAccount,
                        accountName: qrData.accountName
                    }
                });
            },
            error: (error: HttpErrorResponse) => {
                this.isSubmitting = false;
                this.toastService.showToast({
                    error: error,
                    defaultMsg: 'Lỗi tạo mã QR thanh toán. Vui lòng thử lại.',
                    title: 'Lỗi'
                });
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/cart']);
    }
}
