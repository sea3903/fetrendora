import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Product } from '../../models/product';
import { environment } from '../../../environments/environment';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiResponse } from '../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../base/base.component';
import { CartItem } from '../../services/cart.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { ProductDetailService } from '../../services/product-detail.service';

interface VariantInfo {
  colorName?: string;
  sizeName?: string;
  originName?: string;
}

interface CartItemWithProduct {
  product: Product;
  quantity: number;
  selected: boolean;
  variant?: VariantInfo;
  productDetailId?: number;
}

@Component({
  selector: 'app-order',
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss'],
  standalone: true,
  imports: [
    FooterComponent,
    HeaderComponent,
    CommonModule,
    RouterModule
  ]
})
export class OrderComponent extends BaseComponent implements OnInit, OnDestroy {
  cartItems: CartItemWithProduct[] = [];
  totalAmount: number = 0;
  selectedCount: number = 0;
  isAllSelected: boolean = false;
  isValidatingStock: boolean = false;

  private cartSubscription?: Subscription;
  private productDetailService = inject(ProductDetailService);

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.loadCartItems();
  }

  ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
  }

  // Load cart items với thông tin sản phẩm
  loadCartItems(): void {
    const cartItems = this.cartService.getCartItems();
    // Lọc bỏ các productId không hợp lệ (0, undefined, null, NaN)
    const productIds = cartItems
      .map(item => item.productId)
      .filter(id => id && !isNaN(id) && id > 0);

    if (productIds.length === 0) {
      this.cartItems = [];
      this.calculateTotal();
      this.updateSelectionState();
      return;
    }

    this.productService.getProductsByIds(productIds).subscribe({
      next: (apiResponse: ApiResponse) => {
        const products: Product[] = apiResponse.data || [];

        this.cartItems = cartItems.map(cartItem => {
          const productFound = products.find(p => p.id === cartItem.productId);
          if (!productFound) return null;

          // QUAN TRỌNG: Tạo bản sao product để tránh nhấp nháy khi cùng productId có nhiều variant
          const product = { ...productFound };
          product.thumbnail = `${environment.apiBaseUrl}/products/images/${product.thumbnail}`;

          return {
            product: product,
            quantity: cartItem.quantity,
            selected: cartItem.selected,
            productDetailId: cartItem.productDetailId,
            variant: {
              colorName: cartItem.colorName,
              sizeName: cartItem.sizeName,
              originName: cartItem.originName
            }
          };
        }).filter(item => item !== null) as CartItemWithProduct[];

        this.calculateTotal();
        this.updateSelectionState();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading cart items:', error);
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Lỗi tải giỏ hàng',
          title: 'Lỗi'
        });
      }
    });
  }

  // Giảm số lượng
  decreaseQuantity(index: number): void {
    if (this.cartItems[index].quantity > 1) {
      this.cartItems[index].quantity--;
      const item = this.cartItems[index];
      // FIX logic: Dùng productDetailId làm key nếu có
      const key = item.productDetailId || item.product.id;
      this.cartService.updateQuantity(key, item.quantity);
      this.calculateTotal();
    }
  }

  // Tăng số lượng
  increaseQuantity(index: number): void {
    this.cartItems[index].quantity++;
    const item = this.cartItems[index];
    // FIX logic: Dùng productDetailId làm key nếu có
    const key = item.productDetailId || item.product.id;
    this.cartService.updateQuantity(key, item.quantity);
    this.calculateTotal();
  }

  // Toggle checkbox một item (nhận index thay vì ID để chuẩn xác)
  toggleItemSelection(index: number): void {
    const item = this.cartItems[index];
    if (item) {
      item.selected = !item.selected;
      // FIX logic: Dùng productDetailId làm key nếu có
      const key = item.productDetailId || item.product.id;
      this.cartService.toggleSelection(key);
      this.calculateTotal();
      this.updateSelectionState();
    }
  }

  // Toggle chọn tất cả
  toggleSelectAll(): void {
    this.isAllSelected = !this.isAllSelected;
    this.cartItems.forEach(item => item.selected = this.isAllSelected);
    this.cartService.selectAll(this.isAllSelected);
    this.calculateTotal();
    this.updateSelectionState();
  }

  // Cập nhật trạng thái chọn
  updateSelectionState(): void {
    this.selectedCount = this.cartItems.filter(item => item.selected).length;
    this.isAllSelected = this.cartItems.length > 0 &&
      this.cartItems.every(item => item.selected);
  }

  // Xóa sản phẩm (nhận index thay vì ID)
  removeItem(index: number): void {
    const item = this.cartItems[index];
    if (item) {
      // FIX logic: Dùng productDetailId làm key nếu có
      const key = item.productDetailId || item.product.id;
      this.cartService.removeItem(key); // Gọi service xóa đúng item

      // Xóa khỏi list local
      this.cartItems.splice(index, 1);

      this.calculateTotal();
      this.updateSelectionState();
    }
  }

  // Tính tổng tiền (chỉ các item được chọn)
  calculateTotal(): void {
    this.totalAmount = this.cartItems
      .filter(item => item.selected)
      .reduce((total, item) => total + item.product.price * item.quantity, 0);
    this.selectedCount = this.cartItems.filter(item => item.selected).length;
  }

  // Chuyển đến trang thanh toán - có kiểm tra tồn kho
  proceedToCheckout(): void {
    if (this.selectedCount === 0) {
      this.toastService.showToast({
        error: 'Vui lòng chọn sản phẩm để thanh toán',
        defaultMsg: 'Vui lòng chọn sản phẩm để thanh toán',
        title: 'Thông báo'
      });
      return;
    }

    // Lấy các item đã chọn có productDetailId
    const selectedItems = this.cartItems.filter(item => item.selected);
    const itemsWithVariant = selectedItems.filter(item => item.productDetailId);

    // Nếu không có variant nào cần check -> đi thẳng checkout
    if (itemsWithVariant.length === 0) {
      this.router.navigate(['/checkout']);
      return;
    }

    // Kiểm tra tồn kho cho từng variant
    this.isValidatingStock = true;
    const stockChecks = itemsWithVariant.map(item =>
      this.productDetailService.getById(item.productDetailId!)
    );

    forkJoin(stockChecks).subscribe({
      next: (responses: ApiResponse[]) => {
        this.isValidatingStock = false;
        const outOfStockItems: string[] = [];

        responses.forEach((response, index) => {
          const variant = response.data;
          const cartItem = itemsWithVariant[index];

          if (variant && cartItem.quantity > variant.stock_quantity) {
            // Tên sản phẩm + thông tin variant
            let itemName = cartItem.product.name;
            if (cartItem.variant?.colorName) itemName += ` - ${cartItem.variant.colorName}`;
            if (cartItem.variant?.sizeName) itemName += ` - ${cartItem.variant.sizeName}`;
            if (cartItem.variant?.originName) itemName += ` - ${cartItem.variant.originName}`;
            outOfStockItems.push(`${itemName}: còn ${variant.stock_quantity}, bạn chọn ${cartItem.quantity}`);
          }
        });

        if (outOfStockItems.length > 0) {
          this.toastService.showToast({
            error: null,
            defaultMsg: `Số lượng vượt quá tồn kho:\n${outOfStockItems.join('\n')}`,
            title: 'Không đủ hàng'
          });
        } else {
          // Đồng bộ cart trước khi chuyển trang
          selectedItems.forEach(item => {
            const key = item.productDetailId || item.product.id;
            this.cartService.updateQuantity(key, item.quantity);
          });
          this.router.navigate(['/checkout']);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isValidatingStock = false;
        console.error('Error checking stock:', error);
        // Nếu lỗi API, vẫn cho đi checkout (backend sẽ check lại)
        this.router.navigate(['/checkout']);
      }
    });
  }
}
