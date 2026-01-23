import { Component, OnInit, OnDestroy } from '@angular/core';
import { Product } from '../../models/product';
import { environment } from '../../../environments/environment';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiResponse } from '../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../base/base.component';
import { CartItem } from '../../services/cart.service';
import { Subscription } from 'rxjs';

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

  private cartSubscription?: Subscription;

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

        interface CartItemWithProduct {
          product: Product;
          quantity: number;
          selected: boolean;
          variant?: VariantInfo;
          productDetailId?: number; // Thêm field này để xác định biến thể
        }

        // ... (giữa các đoạn code)

        this.cartItems = cartItems.map(cartItem => {
          const product = products.find(p => p.id === cartItem.productId);
          if (product) {
            product.thumbnail = `${environment.apiBaseUrl}/products/images/${product.thumbnail}`;
          }

          return {
            product: product!,
            quantity: cartItem.quantity,
            selected: cartItem.selected,
            productDetailId: cartItem.productDetailId, // Map productDetailId
            variant: {
              colorName: cartItem.colorName,
              sizeName: cartItem.sizeName,
              originName: cartItem.originName
            }
          };
        }).filter(item => item.product);

        // Debug log
        console.log('Cart Items with variants:', this.cartItems);

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
      this.cartService.updateQuantity(
        this.cartItems[index].product.id,
        this.cartItems[index].quantity
      );
      this.calculateTotal();
    }
  }

  // Tăng số lượng
  increaseQuantity(index: number): void {
    this.cartItems[index].quantity++;
    this.cartService.updateQuantity(
      this.cartItems[index].product.id,
      this.cartItems[index].quantity
    );
    this.calculateTotal();
  }

  // Toggle checkbox một item
  toggleItemSelection(productId: number): void {
    const item = this.cartItems.find(i => i.product.id === productId);
    if (item) {
      item.selected = !item.selected;
      this.cartService.toggleSelection(productId);
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

  // Xóa sản phẩm
  removeItem(productId: number): void {
    this.cartService.removeItem(productId);
    this.cartItems = this.cartItems.filter(item => item.product.id !== productId);
    this.calculateTotal();
    this.updateSelectionState();
  }

  // Tính tổng tiền (chỉ các item được chọn)
  calculateTotal(): void {
    this.totalAmount = this.cartItems
      .filter(item => item.selected)
      .reduce((total, item) => total + item.product.price * item.quantity, 0);
    this.selectedCount = this.cartItems.filter(item => item.selected).length;
  }

  // Chuyển đến trang thanh toán
  proceedToCheckout(): void {
    if (this.selectedCount === 0) {
      this.toastService.showToast({
        error: 'Vui lòng chọn sản phẩm để thanh toán',
        defaultMsg: 'Vui lòng chọn sản phẩm để thanh toán',
        title: 'Thông báo'
      });
      return;
    }
    // Navigate đến trang checkout
    this.router.navigate(['/checkout']);
  }
}
