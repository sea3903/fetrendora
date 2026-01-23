import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Product } from '../../models/product';
import { Category } from '../../models/category';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../responses/api.response';

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
export class HomeComponent extends BaseComponent implements OnInit {
  products: Product[] = [];
  categories: Category[] = []; // Dữ liệu động từ categoryService
  selectedCategoryId: number = 0; // Giá trị category được chọn
  currentPage: number = 0;
  itemsPerPage: number = 12;
  pages: number[] = [];
  totalPages: number = 0;
  visiblePages: number[] = [];
  keyword: string = "";
  localStorage?: Storage | undefined;
  apiBaseUrl = environment.apiBaseUrl;
  favoriteProductIds: Set<number> = new Set(); // Danh sách ID sản phẩm đã yêu thích
  isLoggedIn: boolean = false;

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
    this.activatedRoute.queryParams.subscribe(params => {
      this.currentPage = Number(params['page']) || 0;
      this.keyword = params['keyword'] || '';
      this.selectedCategoryId = Number(params['categoryId']) || 0;
    });
    this.getProducts(this.keyword, this.selectedCategoryId, this.currentPage, this.itemsPerPage);
    this.getCategories();
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

  // Hàm xử lý sự kiện khi sản phẩm được bấm vào
  onProductClick(productId: number) {
    // Điều hướng đến trang detail-product với productId là tham số
    this.router.navigate(['/products', productId]);
  }

  // Toggle yêu thích sản phẩm
  toggleFavorite(event: Event, productId: number) {
    event.stopPropagation(); // Ngăn chặn click vào sản phẩm
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
      // Bỏ yêu thích
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
      // Thêm yêu thích
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

  // Kiểm tra sản phẩm có trong yêu thích không
  isFavorite(productId: number): boolean {
    return this.favoriteProductIds.has(productId);
  }

  // Load danh sách sản phẩm yêu thích
  loadFavoriteProducts() {
    this.productService.getFavoriteProducts().subscribe({
      next: (apiResponse: ApiResponse) => {
        const favoriteProducts: Product[] = apiResponse.data || [];
        this.favoriteProductIds = new Set(favoriteProducts.map(p => p.id));
      },
      error: () => {
        // Không hiển thị lỗi nếu chưa có yêu thích nào
      }
    });
  }
}
