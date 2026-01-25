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
  selectedOriginId?: number;
  selectedVariant?: ProductDetail;

  // Dynamic Selling Attributes
  requiredAttributes: Set<string> = new Set();
  hasSellingAttributesConfig: boolean = false; // true nếu sản phẩm có cấu hình selling_attributes

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

        // Parse selling attributes
        this.requiredAttributes.clear();
        this.hasSellingAttributesConfig = false;
        if (this.product?.selling_attributes && this.product.selling_attributes.trim() !== '') {
          this.hasSellingAttributesConfig = true;
          const attrs = this.product.selling_attributes.split(',').map(s => s.trim().toLowerCase());
          attrs.forEach(a => this.requiredAttributes.add(a));
        }

        this.showImage(0);
        // Nếu product details đã load trước đó
        if (this.productDetails.length > 0) {
          this.checkInitialSelection();
        }
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
        this.checkInitialSelection();
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

  // Lấy danh sách xuất xứ duy nhất từ variants
  getUniqueOrigins(): ProductDetail[] {
    const originMap = new Map<number, ProductDetail>();
    this.productDetails.forEach(variant => {
      if (variant.origin_id && variant.origin_name && !originMap.has(variant.origin_id)) {
        originMap.set(variant.origin_id, variant);
      }
    });
    return Array.from(originMap.values());
  }

  selectOrigin(originId: number) {
    this.selectedOriginId = originId;
    this.updateSelectedVariant();
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

  checkInitialSelection() {
    if (!this.productDetails || this.productDetails.length === 0) return;

    // Nếu không có config selling_attributes -> Giữ logic cũ (auto chọn cái đầu)
    if (!this.hasSellingAttributesConfig) {
      const firstVariant = this.productDetails[0];
      this.selectedColorId = firstVariant.color_id;
      this.selectedSizeId = firstVariant.size_id;
      this.selectedOriginId = firstVariant.origin_id;
      this.updateSelectedVariant();
      return;
    }

    // Nếu có config -> Reset selection, chỉ auto-select những cái NON-REQUIRED nếu có thể xác định ngay
    this.selectedColorId = undefined;
    this.selectedSizeId = undefined;
    this.selectedOriginId = undefined;
    this.selectedVariant = undefined;

    // Nếu chỉ có 1 variant duy nhất -> Chọn luôn bất kể config
    if (this.productDetails.length === 1) {
      const v = this.productDetails[0];
      this.selectedColorId = v.color_id;
      this.selectedSizeId = v.size_id;
      this.selectedOriginId = v.origin_id;
      this.updateSelectedVariant();
    }
  }

  // Cập nhật logic chọn variant động
  updateSelectedVariant() {
    // 1. Tìm các variant khớp với những gì User ĐÃ chọn (chỉ xét các field required đã chọn)
    let candidates = this.productDetails;

    if (this.requiredAttributes.has('color') && this.selectedColorId) {
      candidates = candidates.filter(v => v.color_id === this.selectedColorId);
    }
    if (this.requiredAttributes.has('size') && this.selectedSizeId) {
      candidates = candidates.filter(v => v.size_id === this.selectedSizeId);
    }
    if (this.requiredAttributes.has('origin') && this.selectedOriginId) {
      candidates = candidates.filter(v => v.origin_id === this.selectedOriginId);
    }

    // 2. Nếu đã chọn đủ các Required Attributes
    const isColorSelected = !this.requiredAttributes.has('color') || !!this.selectedColorId;
    const isSizeSelected = !this.requiredAttributes.has('size') || !!this.selectedSizeId;
    const isOriginSelected = !this.requiredAttributes.has('origin') || !!this.selectedOriginId;

    if (isColorSelected && isSizeSelected && isOriginSelected && candidates.length > 0) {
      // Tìm best match (ưu tiên còn hàng)
      const bestMatch = candidates.find(v => v.stock_quantity > 0) || candidates[0];
      this.selectedVariant = bestMatch;

      // Auto-fill các thuộc tính KHÔNG required (lấy từ bestMatch)
      if (!this.requiredAttributes.has('color')) this.selectedColorId = bestMatch.color_id;
      if (!this.requiredAttributes.has('size')) this.selectedSizeId = bestMatch.size_id;
      if (!this.requiredAttributes.has('origin')) this.selectedOriginId = bestMatch.origin_id;
    } else {
      this.selectedVariant = undefined;
      // Vẫn có thể auto-fill UI cho các option non-required dựa trên candidates gộp?
      // Tạm thời chưa cần complex logic này để tránh rối UI
    }
  }

  // Helper để kiểm tra có cần hiển thị section chọn không
  shouldShowAttribute(attrName: string): boolean {
    if (!this.hasSellingAttributesConfig) return true; // Hiện all nếu không config
    return this.requiredAttributes.has(attrName);
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
    if (!this.isLoggedIn) {
      this.toastService.showToast({
        error: null,
        defaultMsg: 'Vui lòng đăng nhập để mua hàng',
        title: 'Yêu cầu đăng nhập'
      });
      this.router.navigate(['/login']);
      return;
    }

    if (!this.product) {
      this.toastService.showToast({
        error: null,
        defaultMsg: 'Không thể thêm sản phẩm vào giỏ hàng',
        title: 'Lỗi'
      });
      return;
    }

    if (this.productDetails.length > 0 && !this.selectedVariant) {
      let msg = 'Vui lòng chọn đầy đủ thuộc tính sản phẩm';

      // Gợi ý cụ thể hơn nếu có config
      if (this.hasSellingAttributesConfig) {
        const missing = [];
        if (this.requiredAttributes.has('color') && !this.selectedColorId) missing.push('Màu sắc');
        if (this.requiredAttributes.has('size') && !this.selectedSizeId) missing.push('Kích thước');
        if (this.requiredAttributes.has('origin') && !this.selectedOriginId) missing.push('Xuất xứ');

        if (missing.length > 0) {
          msg = `Vui lòng chọn: ${missing.join(', ')}`;
        }
      }

      this.toastService.showToast({
        error: null,
        defaultMsg: msg,
        title: 'Thông báo'
      });
      return;
    }

    // Prepare variant info
    const variantInfo = this.selectedVariant ? {
      productDetailId: this.selectedVariant.id,
      colorName: this.selectedVariant.color_name,
      sizeName: this.selectedVariant.size_name,
      originName: this.selectedVariant.origin_name
    } : undefined;

    this.cartService.addToCart(this.productId, this.quantity, variantInfo);
    this.isPressedAddToCart = true;

    this.toastService.showToast({
      error: null,
      defaultMsg: 'Đã thêm vào giỏ hàng',
      title: 'Thành công'
    });
  }

  buyNow(): void {
    if (!this.isLoggedIn) {
      this.toastService.showToast({
        error: null,
        defaultMsg: 'Vui lòng đăng nhập để mua hàng',
        title: 'Yêu cầu đăng nhập'
      });
      this.router.navigate(['/login']);
      return;
    }

    if (this.isPressedAddToCart == false) {
      this.addToCart();
    }
    this.router.navigate(['/orders']); // Lưu ý: route đúng có thể là /cart hoặc /checkout tùy logic
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

  // Format description: chuyển \n thành <br> và xử lý HTML cơ bản
  formatDescription(text: string | undefined): string {
    if (!text) return '';
    // Chuyển \n thành <br>
    return text.replace(/\n/g, '<br>');
  }
}
