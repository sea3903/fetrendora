import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  productId: number;
  quantity: number;
  selected: boolean; // Checkbox selection
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cart: Map<number, CartItem> = new Map();
  private localStorage?: Storage;

  // Observable để các component có thể subscribe
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.localStorage = document.defaultView?.localStorage;
    this.refreshCart();
  }

  // Lấy cart key theo user
  private getCartKey(): string {
    const userResponseJSON = this.localStorage?.getItem('user');
    if (!userResponseJSON) return 'cart:guest';
    try {
      const userResponse = JSON.parse(userResponseJSON);
      return `cart:${userResponse?.id ?? 'guest'}`;
    } catch {
      return 'cart:guest';
    }
  }

  // Load cart từ localStorage (hỗ trợ cả format cũ và mới)
  refreshCart(): void {
    const storedCart = this.localStorage?.getItem(this.getCartKey());
    if (storedCart) {
      try {
        const parsed = JSON.parse(storedCart);
        this.cart = new Map();

        // Kiểm tra format của data
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (Array.isArray(item) && item.length === 2) {
              const [productId, value] = item;

              // Format mới: [productId, CartItem]
              if (typeof value === 'object' && 'productId' in value) {
                this.cart.set(productId, value as CartItem);
              }
              // Format cũ: [productId, quantity] 
              else if (typeof value === 'number') {
                this.cart.set(productId, {
                  productId: productId,
                  quantity: value,
                  selected: true
                });
              }
            }
          });
        }
      } catch (e) {
        console.error('Error parsing cart from localStorage:', e);
        this.cart = new Map();
      }
    } else {
      this.cart = new Map();
    }
    this.emitCart();
  }

  // Emit cart changes
  private emitCart(): void {
    this.cartSubject.next(Array.from(this.cart.values()));
  }

  // Lưu cart vào localStorage
  private saveCartToLocalStorage(): void {
    this.localStorage?.setItem(
      this.getCartKey(),
      JSON.stringify(Array.from(this.cart.entries()))
    );
    this.emitCart();
  }

  // Thêm sản phẩm vào giỏ
  addToCart(productId: number, quantity: number = 1): void {
    if (this.cart.has(productId)) {
      const item = this.cart.get(productId)!;
      item.quantity += quantity;
      this.cart.set(productId, item);
    } else {
      this.cart.set(productId, {
        productId,
        quantity,
        selected: true // Mặc định được chọn
      });
    }
    this.saveCartToLocalStorage();
  }

  // Cập nhật số lượng
  updateQuantity(productId: number, quantity: number): void {
    if (this.cart.has(productId) && quantity > 0) {
      const item = this.cart.get(productId)!;
      item.quantity = quantity;
      this.cart.set(productId, item);
      this.saveCartToLocalStorage();
    }
  }

  // Toggle selection
  toggleSelection(productId: number): void {
    if (this.cart.has(productId)) {
      const item = this.cart.get(productId)!;
      item.selected = !item.selected;
      this.cart.set(productId, item);
      this.saveCartToLocalStorage();
    }
  }

  // Chọn tất cả / Bỏ chọn tất cả
  selectAll(selected: boolean): void {
    this.cart.forEach((item, productId) => {
      item.selected = selected;
      this.cart.set(productId, item);
    });
    this.saveCartToLocalStorage();
  }

  // Xóa sản phẩm khỏi giỏ
  removeItem(productId: number): void {
    this.cart.delete(productId);
    this.saveCartToLocalStorage();
  }

  // Lấy tất cả items
  getCart(): Map<number, number> {
    // Backward compatible: return Map<productId, quantity>
    const simpleCart = new Map<number, number>();
    this.cart.forEach((item, productId) => {
      simpleCart.set(productId, item.quantity);
    });
    return simpleCart;
  }

  // Lấy cart items đầy đủ
  getCartItems(): CartItem[] {
    return Array.from(this.cart.values());
  }

  // Lấy selected items
  getSelectedItems(): CartItem[] {
    return Array.from(this.cart.values()).filter(item => item.selected);
  }

  // Lấy product IDs được chọn
  getSelectedProductIds(): number[] {
    return this.getSelectedItems().map(item => item.productId);
  }

  // Set cart (backward compatible)
  setCart(cart: Map<number, number>): void {
    this.cart.clear();
    cart.forEach((quantity, productId) => {
      this.cart.set(productId, {
        productId,
        quantity,
        selected: true
      });
    });
    this.saveCartToLocalStorage();
  }

  // Xóa các items đã chọn (sau khi checkout)
  clearSelectedItems(): void {
    this.cart.forEach((item, productId) => {
      if (item.selected) {
        this.cart.delete(productId);
      }
    });
    this.saveCartToLocalStorage();
  }

  // Xóa toàn bộ giỏ hàng
  clearCart(): void {
    this.cart.clear();
    this.saveCartToLocalStorage();
  }

  // Đếm số lượng items trong giỏ
  getItemCount(): number {
    return this.cart.size;
  }

  // Đếm số lượng items được chọn
  getSelectedCount(): number {
    return this.getSelectedItems().length;
  }
}
