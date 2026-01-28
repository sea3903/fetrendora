import { Component, OnInit, Inject, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { Product } from '../../models/product';
import { Category } from '../../models/category';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../responses/api.response';
import { Coupon } from '../../models/coupon';
import { CouponService } from '../../services/coupon.service';

import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../base/base.component';
import { TokenService } from '../../services/token.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [
    FooterComponent,
    HeaderComponent,
    CommonModule,
    FormsModule
  ]
})
export class HomeComponent extends BaseComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  categories: Category[] = [];
  selectedCategoryId: number = 0;
  currentPage: number = 0;
  itemsPerPage: number = 12;
  pages: number[] = [];
  totalPages: number = 0;
  visiblePages: number[] = [];

  // Banner Slide Config
  banners: string[] = [
    'https://cdn.hstatic.net/files/1000184601/file/1910x770__2__fbe43212b6954e7f8aa2019217a5c249.jpg',
    'https://cdn.hstatic.net/files/1000184601/file/1910x770__1__55bc721e92c2419ea46aabe86ab0aac4.jpg'
  ];
  currentBannerIndex: number = 0;
  bannerInterval: any;

  keyword: string = "";
  localStorage?: Storage | undefined;
  apiBaseUrl = environment.apiBaseUrl;
  favoriteProductIds: Set<number> = new Set();
  isLoggedIn: boolean = false;

  // Flash Sale Logic
  activeCoupons: Coupon[] = [];
  override couponService = inject(CouponService);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    super();
    if (isPlatformBrowser(this.platformId)) {
      this.localStorage = this.document.defaultView?.localStorage;
    }
    this.isLoggedIn = this.tokenService.getToken() != null;
    if (this.isLoggedIn && isPlatformBrowser(this.platformId)) {
      this.loadFavoriteProducts();
    }
  }

  ngOnInit() {
    this.loadActiveCoupons(); // Load coupons
    this.activatedRoute.queryParams.subscribe(params => {
      this.currentPage = Number(params['page']) || 0;
      this.keyword = params['keyword'] || '';
      this.selectedCategoryId = Number(params['categoryId']) || 0;
    });
    this.getProducts(this.keyword, this.selectedCategoryId, this.currentPage, this.itemsPerPage);
    this.getCategories();
    this.startBannerSlide();
  }

  ngOnDestroy() {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
    }
  }

  // --- Flash Sale Logic ---
  private loadActiveCoupons() {
    this.couponService.getCoupons().subscribe({
      next: (response: ApiResponse) => {
        this.activeCoupons = response.data.filter((c: Coupon) => c.active);
      },
      error: (err) => console.error('Failed to load coupons', err)
    });
  }

  isFlashSale(product: Product): boolean {
    if (!this.activeCoupons.length) return false;
    // Check Product Specific
    const productCoupon = this.activeCoupons.find(c => c.product_id === product.id);
    if (productCoupon) return true;

    // Check Category Specific
    const categoryCoupon = this.activeCoupons.find(c => c.category_id === product.category_id);
    if (categoryCoupon) return true;

    return false;
  }

  // --- UI Logic ---
  startBannerSlide() {
    this.bannerInterval = setInterval(() => {
      this.nextBanner();
    }, 5000); // 5 seconds
  }

  nextBanner() {
    this.currentBannerIndex = (this.currentBannerIndex + 1) % this.banners.length;
  }

  prevBanner() {
    this.currentBannerIndex = (this.currentBannerIndex - 1 + this.banners.length) % this.banners.length;
  }

  goToBanner(index: number) {
    this.currentBannerIndex = index;
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
      this.startBannerSlide();
    }
  }

  getCategories() {
    this.categoryService.getCategories().subscribe({
      next: (apiResponse: ApiResponse) => {
        this.categories = apiResponse.data;
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Lỗi tải danh sách danh mục',
          title: 'Lỗi Tải Dữ Liệu'
        });
      }
    });
  }

  searchProducts() {
    this.currentPage = 0;
    this.itemsPerPage = 12;
    this.getProducts(this.keyword, this.selectedCategoryId, this.currentPage, this.itemsPerPage);
    this.router.navigate(['/home'], {
      queryParams:
        { keyword: this.keyword, categoryId: this.selectedCategoryId, page: this.currentPage }
    });
  }

  getProducts(keyword: string, selectedCategoryId: number, page: number, limit: number) {
    this.productService.getProducts(keyword, selectedCategoryId, page, limit).subscribe({
      next: (apiresponse: ApiResponse) => {
        const response = apiresponse.data;
        response.products.forEach((product: Product) => {
          product.url = `${environment.apiBaseUrl}/products/images/${product.thumbnail}`;
        });
        this.products = response.products;
        this.totalPages = response.totalPages;
        this.visiblePages = this.generateVisiblePageArray(this.currentPage, this.totalPages);
      },
      complete: () => {
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Lỗi tải danh sách sản phẩm',
          title: 'Lỗi Tải Dữ Liệu'
        });
      }
    });
  }

  onPageChange(page: number) {
    this.currentPage = page < 0 ? 0 : page;
    this.getProducts(this.keyword, this.selectedCategoryId, this.currentPage, this.itemsPerPage);
    this.router.navigate(['/home'], { queryParams: { page: this.currentPage } });
  }

  onProductClick(productId: number) {
    this.router.navigate(['/products', productId]);
  }

  toggleFavorite(event: Event, productId: number) {
    event.stopPropagation();
    if (!this.isLoggedIn) {
      this.toastService.showToast({
        error: null,
        defaultMsg: 'Vui lòng đăng nhập để thêm vào yêu thích',
        title: 'Thông báo'
      });
      return;
    }

    const isFavorite = this.favoriteProductIds.has(productId);
    if (isFavorite) {
      this.productService.unlikeProduct(productId).subscribe({
        next: () => {
          this.favoriteProductIds.delete(productId);
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
      this.productService.likeProduct(productId).subscribe({
        next: () => {
          this.favoriteProductIds.add(productId);
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

  isFavorite(productId: number): boolean {
    return this.favoriteProductIds.has(productId);
  }

  loadFavoriteProducts() {
    this.productService.getFavoriteProducts().subscribe({
      next: (apiResponse: ApiResponse) => {
        const favoriteProducts: Product[] = apiResponse.data || [];
        this.favoriteProductIds = new Set(favoriteProducts.map(p => p.id));
      },
      error: () => {
      }
    });
  }
}
