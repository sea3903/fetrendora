import { Component, OnInit, Inject, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { Product } from '../../models/product';
import { Category } from '../../models/category';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../responses/api.response';
import { Coupon } from '../../models/coupon';
import { CouponService } from '../../services/coupon.service';
import { EventService, Event as EventModel } from '../../services/event.service';
import { BrandService } from '../../services/brand.service';
import { Brand } from '../../models/brand';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../base/base.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [
    FooterComponent,
    HeaderComponent,
    CommonModule,
    FormsModule,
    RouterModule
  ]
})
export class HomeComponent extends BaseComponent implements OnInit, OnDestroy {
  // All Products (Paginated)
  products: Product[] = [];
  totalProducts: number = 0;
  currentPage: number = 0;
  itemsPerPage: number = 12;
  totalPages: number = 0;
  visiblePages: number[] = [];

  // New Products (Max 8)
  newProducts: Product[] = [];

  // Event
  currentEvent: EventModel | null = null;
  eventVideoUrl: SafeResourceUrl | null = null;
  currentBannerIndex: number = 0;
  bannerInterval: any;

  // Brands & Coupons
  brands: Brand[] = [];
  activeCoupons: Coupon[] = [];

  // Countdown timer
  days: number = 0;
  hours: number = 0;
  minutes: number = 0;
  seconds: number = 0;
  timerInterval: any;
  eventStatus: 'upcoming' | 'ongoing' | 'ended' = 'ended';

  // Other
  apiBaseUrl = environment.apiBaseUrl;
  favoriteProductIds: Set<number> = new Set();
  isLoggedIn: boolean = false;

  // Services
  override couponService = inject(CouponService);
  private eventService = inject(EventService);
  private brandService = inject(BrandService);
  private sanitizer = inject(DomSanitizer);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    super();
    const token = this.tokenService.getToken();
    this.isLoggedIn = !!token && token.length > 0;
    if (this.isLoggedIn && isPlatformBrowser(this.platformId)) {
      this.loadFavoriteProducts();
    }
  }

  ngOnInit() {
    this.loadHomeEvent();
    this.loadBrands();
    this.loadNewProducts();
    this.loadAllProducts();
    this.startBannerSlide();
  }

  ngOnDestroy() {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EVENT
  // ════════════════════════════════════════════════════════════════════════════

  private loadHomeEvent(): void {
    this.eventService.getHomeEvent().subscribe({
      next: (response: ApiResponse) => {
        if (response.data) {
          this.currentEvent = response.data;

          // Thêm logic: Đưa thumbnail vào danh sách ảnh để banner slide
          if (this.currentEvent?.thumbnail_url) {
            const thumbUrl = this.currentEvent.thumbnail_url;
            // Kiểm tra xem đã có trong list images chưa (tránh trùng lặp)
            const exists = this.currentEvent.images?.some(img => img.image_url === thumbUrl || img.image_url.endsWith(thumbUrl));

            if (!exists) {
              if (!this.currentEvent.images) this.currentEvent.images = [];
              // Thêm vào đầu danh sách
              this.currentEvent.images.unshift({
                id: -1, // ID giả
                image_url: thumbUrl,
                image_type: 'url',
                display_order: -1
              });
            }
          }

          this.startCountdown();

          if (this.currentEvent?.video_url) {
            this.eventVideoUrl = this.getYoutubeEmbedUrl(this.currentEvent.video_url);
          }
          if (this.currentEvent?.coupons && this.currentEvent.coupons.length > 0) {
            this.activeCoupons = this.currentEvent.coupons;
          }
        } else {
          // Không có sự kiện -> currentEvent = null -> Sẽ hiện Default Banner
          this.currentEvent = null;
        }
      },
      error: (err: any) => console.error('Lỗi khi tải sự kiện', err)
    });
  }

  private getYoutubeEmbedUrl(url: string): SafeResourceUrl | null {
    if (!url) return null;
    let videoId = '';
    if (url.includes('youtube.com/watch')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      videoId = urlParams.get('v') || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0] || '';
    }
    if (videoId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`);
    }
    return null;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BRANDS
  // ════════════════════════════════════════════════════════════════════════════

  private loadBrands(): void {
    this.brandService.getAllBrands().subscribe({
      next: (response: ApiResponse) => {
        this.brands = response.data || [];
      },
      error: (err: any) => console.error('Lỗi tải thương hiệu', err)
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRODUCTS
  // ════════════════════════════════════════════════════════════════════════════

  // Load New Products (Latest 4)
  private loadNewProducts(): void {
    this.productService.getProducts('', 0, 0, 4).subscribe({
      next: (response: ApiResponse) => {
        const data = response.data;
        this.newProducts = data.products.map((product: Product) => ({
          ...product,
          url: `${environment.apiBaseUrl}/products/images/${product.thumbnail}`
        }));
      },
      error: (err: HttpErrorResponse) => console.error('Lỗi tải sản phẩm mới', err)
    });
  }

  // Load All Products (Paginated)
  private loadAllProducts(): void {
    this.productService.getProducts('', 0, this.currentPage, this.itemsPerPage).subscribe({
      next: (response: ApiResponse) => {
        const data = response.data;
        this.products = data.products.map((product: Product) => ({
          ...product,
          url: `${environment.apiBaseUrl}/products/images/${product.thumbnail}`
        }));
        this.totalProducts = data.totalElements || data.products.length;
        this.totalPages = data.totalPages || 1;
        this.visiblePages = this.generateVisiblePageArray(this.currentPage, this.totalPages);
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.showToast({ error: err, defaultMsg: 'Lỗi tải sản phẩm', title: 'Lỗi' });
      }
    });
  }

  changePage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.loadAllProducts();
    // Scroll to products section
    const section = document.querySelector('.all-products-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onProductClick(productId: number): void {
    this.router.navigate(['/products', productId]);
  }

  isFlashSale(product: Product): boolean {
    if (!this.activeCoupons.length) return false;
    return this.activeCoupons.some(c => c.product_id === product.id || c.category_id === product.category_id);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BANNER
  // ════════════════════════════════════════════════════════════════════════════

  startBannerSlide(): void {
    this.bannerInterval = setInterval(() => this.nextBanner(), 5000);
  }

  nextBanner(): void {
    const max = this.currentEvent?.images?.length || 1;
    this.currentBannerIndex = (this.currentBannerIndex + 1) % max;
  }

  prevBanner(): void {
    const max = this.currentEvent?.images?.length || 1;
    this.currentBannerIndex = (this.currentBannerIndex - 1 + max) % max;
  }

  goToBanner(index: number): void {
    this.currentBannerIndex = index;
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
      this.startBannerSlide();
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // IMAGE URLs
  // ════════════════════════════════════════════════════════════════════════════

  getEventImageUrl(imageUrl: string): string {
    if (!imageUrl) return 'assets/images/banner-placeholder.jpg';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${this.apiBaseUrl}/events/images/${imageUrl}`;
  }

  getBrandImageUrl(logoUrl: string): string {
    if (!logoUrl) return '';
    if (logoUrl.startsWith('http')) return logoUrl;
    return `${this.apiBaseUrl}/products/images/${logoUrl}`;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VOUCHER
  // ════════════════════════════════════════════════════════════════════════════

  copyVoucherCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.toastService.showToast({ error: null, defaultMsg: `Đã sao chép mã: ${code}`, title: 'Thành công' });
    }).catch(() => {
      this.toastService.showToast({ error: null, defaultMsg: 'Không thể sao chép mã', title: 'Lỗi' });
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FAVORITES
  // ════════════════════════════════════════════════════════════════════════════

  toggleFavorite(event: Event, productId: number): void {
    (event as any).stopPropagation();
    if (!this.isLoggedIn) {
      this.toastService.showToast({ error: null, defaultMsg: 'Vui lòng đăng nhập', title: 'Thông báo' });
      return;
    }

    const isFav = this.favoriteProductIds.has(productId);
    if (isFav) {
      this.productService.unlikeProduct(productId).subscribe({
        next: () => {
          this.favoriteProductIds.delete(productId);
          this.toastService.showToast({ error: null, defaultMsg: 'Đã bỏ yêu thích', title: 'Thành công' });
        },
        error: (err) => this.toastService.showToast({ error: err, defaultMsg: 'Lỗi', title: 'Lỗi' })
      });
    } else {
      this.productService.likeProduct(productId).subscribe({
        next: () => {
          this.favoriteProductIds.add(productId);
          this.toastService.showToast({ error: null, defaultMsg: 'Đã thêm yêu thích', title: 'Thành công' });
        },
        error: (err) => this.toastService.showToast({ error: err, defaultMsg: 'Lỗi', title: 'Lỗi' })
      });
    }
  }

  isFavorite(productId: number): boolean {
    return this.favoriteProductIds.has(productId);
  }

  loadFavoriteProducts(): void {
    this.productService.getFavoriteProducts().subscribe({
      next: (response: ApiResponse) => {
        const favorites: Product[] = response.data || [];
        this.favoriteProductIds = new Set(favorites.map(p => p.id));
      },
      error: () => { }
    });
  }

  private startCountdown(): void {
    if (!this.currentEvent) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const start = new Date(this.currentEvent!.start_date).getTime();
      const end = new Date(this.currentEvent!.end_date).getTime();

      let distance = 0;

      if (now < start) {
        this.eventStatus = 'upcoming';
        distance = start - now;
      } else if (now >= start && now <= end) {
        this.eventStatus = 'ongoing';
        distance = end - now;
      } else {
        this.eventStatus = 'ended';
        distance = 0;
        if (this.timerInterval) clearInterval(this.timerInterval);
      }

      this.days = Math.floor(distance / (1000 * 60 * 60 * 24));
      this.hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      this.minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      this.seconds = Math.floor((distance % (1000 * 60)) / 1000);
    };

    updateTimer(); // Run immediately
    this.timerInterval = setInterval(updateTimer, 1000);
  }
}
