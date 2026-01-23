import { Component, OnInit, inject } from '@angular/core';
import { Product } from '../../models/product';
import { ProductDetail } from '../../models/product-detail';
import { Comment } from '../../models/comment';
import { environment } from '../../../environments/environment';
import { ProductImage } from '../../models/product.image';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';
import { ApiResponse } from '../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../base/base.component';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductDetailService } from '../../services/product-detail.service';
import { CommentService, CommentDTO } from '../../services/comment.service';
import { UserResponse } from '../../responses/user/user.response';

@Component({
  selector: 'app-detail-product',
  templateUrl: './detail-product.component.html',
  styleUrls: ['./detail-product.component.scss'],
  imports: [
    FooterComponent,
    HeaderComponent,
    CommonModule,
    FormsModule,
    RouterLink
  ]
})

export class DetailProductComponent extends BaseComponent implements OnInit {
  productDetailService = inject(ProductDetailService);
  commentService = inject(CommentService);

  product?: Product;
  productId: number = 0;
  currentImageIndex: number = 0;
  quantity: number = 1;
  isPressedAddToCart: boolean = false;

  // Variants (biến thể)
  productDetails: ProductDetail[] = [];
  selectedColorId?: number;
  selectedSizeId?: number;
  selectedVariant?: ProductDetail;

  // Yêu thích
  isFavorite: boolean = false;
  isLoggedIn: boolean = false;
  currentUser?: UserResponse;

  // Tabs
  activeTab: 'details' | 'warranty' | 'reviews' = 'details';

  // Comments/Reviews
  comments: Comment[] = [];
  loadingComments: boolean = false;
  newCommentContent: string = '';
  submittingComment: boolean = false;

  // Environment để dùng trong template
  environment = environment;

  // Lightbox
  lightboxOpen: boolean = false;
  lightboxIndex: number = 0;

  ngOnInit() {
    const idParam = this.activatedRoute.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.productId = +idParam;
    }

    this.isLoggedIn = this.tokenService.getToken() != null;
    if (this.isLoggedIn) {
      const savedUser = this.userService.getUserResponseFromLocalStorage();
      if (savedUser) {
        this.currentUser = savedUser;
      }
    }

    if (!isNaN(this.productId)) {
      this.loadProduct();
      this.loadProductDetails();
      if (this.isLoggedIn) {
        this.checkFavoriteStatus();
      }
    } else {
      this.toastService.showToast({
        error: null,
        defaultMsg: 'ID sản phẩm không hợp lệ',
        title: 'Lỗi Dữ Liệu'
      });
    }
  }

  loadProduct() {
    this.productService.getDetailProduct(this.productId).subscribe({
      next: (apiResponse: ApiResponse) => {
        const response = apiResponse.data;
        if (response.product_images && response.product_images.length > 0) {
          response.product_images.forEach((product_image: ProductImage) => {
            product_image.image_url = `${environment.apiBaseUrl}/products/images/${product_image.image_url}`;
          });
        }
        this.product = response;
        this.showImage(0);
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Lỗi tải chi tiết sản phẩm',
          title: 'Lỗi Sản Phẩm'
        });
      }
    });
  }

  loadProductDetails() {
    this.productDetailService.getByProductId(this.productId).subscribe({
      next: (apiResponse: ApiResponse) => {
        this.productDetails = apiResponse.data || [];
        // Tự động chọn variant đầu tiên nếu có
        if (this.productDetails.length > 0) {
          const firstVariant = this.productDetails[0];
          this.selectedColorId = firstVariant.color_id;
          this.selectedSizeId = firstVariant.size_id;
          this.updateSelectedVariant();
        }
      },
      error: () => {
        // Không hiển thị lỗi nếu không có variants
      }
    });
  }

  loadComments() {
    if (this.comments.length > 0) return; // Đã load rồi

    this.loadingComments = true;
    this.commentService.getCommentsByProductId(this.productId).subscribe({
      next: (apiResponse: ApiResponse) => {
        this.comments = apiResponse.data || [];
        this.loadingComments = false;
      },
      error: () => {
        this.loadingComments = false;
      }
    });
  }

  checkFavoriteStatus() {
    this.productService.getFavoriteProducts().subscribe({
      next: (apiResponse: ApiResponse) => {
        const favoriteProducts: Product[] = apiResponse.data || [];
        this.isFavorite = favoriteProducts.some(p => p.id === this.productId);
      },
      error: () => {
        // Không hiển thị lỗi
      }
    });
  }

  // === Tab Logic ===
  switchTab(tab: 'details' | 'warranty' | 'reviews') {
    this.activeTab = tab;
    if (tab === 'reviews') {
      this.loadComments();
    }
  }

  // === Image Gallery ===
  showImage(index: number): void {
    if (this.product && this.product.product_images &&
      this.product.product_images.length > 0) {
      if (index < 0) {
        index = 0;
      } else if (index >= this.product.product_images.length) {
        index = this.product.product_images.length - 1;
      }
      this.currentImageIndex = index;
    }
  }

  thumbnailClick(index: number) {
    this.currentImageIndex = index;
  }

  // === Lightbox ===
  openLightbox(index: number): void {
    this.lightboxIndex = index;
    this.lightboxOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    document.body.style.overflow = '';
  }

  nextImage(event: Event): void {
    event.stopPropagation();
    if (this.product?.product_images) {
      this.lightboxIndex = (this.lightboxIndex + 1) % this.product.product_images.length;
    }
  }

  prevImage(event: Event): void {
    event.stopPropagation();
    if (this.product?.product_images) {
      this.lightboxIndex = (this.lightboxIndex - 1 + this.product.product_images.length) % this.product.product_images.length;
    }
  }

  // === Variant Selection ===
  getUniqueColors(): ProductDetail[] {
    const colorMap = new Map<number, ProductDetail>();
    this.productDetails.forEach(variant => {
      if (variant.color_id && variant.color_name && !colorMap.has(variant.color_id)) {
        colorMap.set(variant.color_id, variant);
      }
    });
    return Array.from(colorMap.values());
  }

  getAvailableSizes(): ProductDetail[] {
    if (!this.selectedColorId) {
      const sizeMap = new Map<number, ProductDetail>();
      this.productDetails.forEach(variant => {
        if (variant.size_id && variant.size_name && !sizeMap.has(variant.size_id)) {
          sizeMap.set(variant.size_id, variant);
        }
      });
      return Array.from(sizeMap.values());
    }

    const sizeMap = new Map<number, ProductDetail>();
    this.productDetails.forEach(variant => {
      if (variant.color_id === this.selectedColorId &&
        variant.size_id &&
        variant.size_name &&
        !sizeMap.has(variant.size_id)) {
        sizeMap.set(variant.size_id, variant);
      }
    });
    return Array.from(sizeMap.values());
  }

  selectColor(colorId: number) {
    this.selectedColorId = colorId;
    this.selectedSizeId = undefined;
    this.updateSelectedVariant();
  }

  selectSize(sizeId: number) {
    this.selectedSizeId = sizeId;
    this.updateSelectedVariant();
  }

  updateSelectedVariant() {
    if (!this.selectedColorId && !this.selectedSizeId) {
      this.selectedVariant = undefined;
      return;
    }

    const variant = this.productDetails.find(v => {
      const colorMatch = !this.selectedColorId || v.color_id === this.selectedColorId;
      const sizeMatch = !this.selectedSizeId || v.size_id === this.selectedSizeId;
      return colorMatch && sizeMatch;
    });

    this.selectedVariant = variant;
  }

  isSizeAvailable(sizeId: number): boolean {
    if (!this.selectedColorId) return true;
    return this.productDetails.some(v =>
      v.color_id === this.selectedColorId &&
      v.size_id === sizeId &&
      v.stock_quantity > 0
    );
  }

  // === Favorite ===
  toggleFavorite() {
    if (!this.isLoggedIn) {
      this.toastService.showToast({
        error: null,
        defaultMsg: 'Vui lòng đăng nhập để thêm vào yêu thích',
        title: 'Thông báo'
      });
      return;
    }

    if (this.isFavorite) {
      this.productService.unlikeProduct(this.productId).subscribe({
        next: () => {
          this.isFavorite = false;
          this.toastService.showToast({
            error: null,
            defaultMsg: 'Đã bỏ yêu thích',
            title: 'Thành công'
          });
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.showToast({
            error: error,
            defaultMsg: 'Lỗi khi bỏ yêu thích',
            title: 'Lỗi'
          });
        }
      });
    } else {
      this.productService.likeProduct(this.productId).subscribe({
        next: () => {
          this.isFavorite = true;
          this.toastService.showToast({
            error: null,
            defaultMsg: 'Đã thêm vào yêu thích',
            title: 'Thành công'
          });
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.showToast({
            error: error,
            defaultMsg: 'Lỗi khi thêm yêu thích',
            title: 'Lỗi'
          });
        }
      });
    }
  }

  // === Quantity ===
  increaseQuantity(): void {
    this.quantity++;
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  // === Cart ===
  addToCart(): void {
    if (!this.product) {
      this.toastService.showToast({
        error: null,
        defaultMsg: 'Không thể thêm sản phẩm vào giỏ hàng',
        title: 'Lỗi'
      });
      return;
    }

    const productIdToAdd = this.selectedVariant ? this.productId : this.product.id;
    this.cartService.addToCart(productIdToAdd, this.quantity);
    this.isPressedAddToCart = true;

    this.toastService.showToast({
      error: null,
      defaultMsg: 'Đã thêm vào giỏ hàng',
      title: 'Thành công'
    });
  }

  buyNow(): void {
    if (this.isPressedAddToCart == false) {
      this.addToCart();
    }
    this.router.navigate(['/orders']);
  }

  // === Comments/Reviews ===
  submitComment(): void {
    if (!this.isLoggedIn || !this.currentUser) {
      this.toastService.showToast({
        error: null,
        defaultMsg: 'Vui lòng đăng nhập để đánh giá',
        title: 'Thông báo'
      });
      return;
    }

    if (!this.newCommentContent.trim()) {
      this.toastService.showToast({
        error: null,
        defaultMsg: 'Vui lòng nhập nội dung đánh giá',
        title: 'Thông báo'
      });
      return;
    }

    this.submittingComment = true;
    const commentDTO: CommentDTO = {
      product_id: this.productId,
      user_id: this.currentUser.id,
      content: this.newCommentContent.trim()
    };

    this.commentService.addComment(commentDTO).subscribe({
      next: () => {
        this.submittingComment = false;
        this.newCommentContent = '';
        this.comments = []; // Reset để reload
        this.loadComments();
        this.toastService.showToast({
          error: null,
          defaultMsg: 'Đánh giá đã được gửi',
          title: 'Thành công'
        });
      },
      error: (error: HttpErrorResponse) => {
        this.submittingComment = false;
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Lỗi khi gửi đánh giá',
          title: 'Lỗi'
        });
      }
    });
  }

  // === Helpers ===
  getAvatarUrl(user: any): string {
    if (!user?.profile_image) return 'assets/images/user-placeholder.png';
    if (user.profile_image.startsWith('http')) return user.profile_image;
    return `${environment.apiBaseUrl}/users/profile-images/${user.profile_image}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
