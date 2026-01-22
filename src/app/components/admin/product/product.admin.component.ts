import { Component, OnInit } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Product } from '../../../models/product';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiResponse } from '../../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../../base/base.component';

@Component({
  selector: 'app-product-admin',
  templateUrl: './product.admin.component.html',
  styleUrls: ['./product.admin.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class ProductAdminComponent extends BaseComponent implements OnInit {
  products: Product[] = [];
  currentPage: number = 0;
  itemsPerPage: number = 12;
  totalPages: number = 0;
  visiblePages: number[] = [];
  keyword: string = '';
  selectedCategoryId: number = 0;
  activeTab: 'active' | 'hidden' = 'active'; // Tab State
  loading: boolean = false;
  localStorage?: Storage;

  constructor() {
    super();
    this.localStorage = document.defaultView?.localStorage;
  }

  ngOnInit() {
    this.currentPage = Number(this.localStorage?.getItem('currentProductAdminPage')) || 0;
    this.getProducts();
  }

  switchTab(tab: 'active' | 'hidden') {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.currentPage = 0;
      this.keyword = "";
      this.getProducts();
    }
  }

  getProducts() {
    this.loading = true;
    // activeTab = 'active' => isActive = true
    // activeTab = 'hidden' => isActive = false
    const isActive = this.activeTab === 'active';

    this.productService.getProducts(
      this.keyword.trim(),
      this.selectedCategoryId,
      this.currentPage,
      this.itemsPerPage,
      isActive
    ).subscribe({
      next: (apiResponse: ApiResponse) => {
        const response = apiResponse.data;
        response.products.forEach((product: Product) => {
          if (product) {
            product.url = product.thumbnail
              ? `${environment.apiBaseUrl}/products/images/${product.thumbnail}`
              : 'assets/images/product-placeholder.png';
          }
        });
        this.products = response.products;
        this.totalPages = response.totalPages;
        this.visiblePages = this.generateVisiblePageArray(this.currentPage, this.totalPages);
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Lỗi tải danh sách sản phẩm',
          title: 'Lỗi'
        });
      }
    });
  }

  searchProducts() {
    this.currentPage = 0;
    this.getProducts();
  }

  onPageChange(page: number) {
    this.currentPage = page < 0 ? 0 : page;
    this.localStorage?.setItem('currentProductAdminPage', String(this.currentPage));
    this.getProducts();
  }

  insertProduct() {
    this.router.navigate(['/admin/products/insert']);
  }

  updateProduct(productId: number) {
    this.router.navigate(['/admin/products/update', productId]);
  }

  toggleStatus(product: Product, enable: boolean) {
    if (!confirm(enable ? 'Bạn có muốn mở bán lại sản phẩm này?' : 'Bạn có muốn ngừng kinh doanh sản phẩm này?')) {
      return;
    }

    // Reuse existing details to satisfy Update DTO
    const updateDTO = {
      name: product.name,
      price: product.price,
      description: product.description,
      category_id: product.category_id,
      brand_id: product.brand_id,
      sku: product.sku,
      slug: product.slug,
      selling_attributes: product.selling_attributes,
      is_active: enable,
      thumbnail: product.thumbnail
    };

    this.productService.updateProduct(product.id, updateDTO).subscribe({
      next: () => {
        this.toastService.showToast({
          error: null,
          defaultMsg: enable ? 'Đã mở bán lại sản phẩm' : 'Đã ẩn sản phẩm',
          title: 'Thành công'
        });
        this.getProducts();
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Lỗi cập nhật trạng thái',
          title: 'Lỗi'
        });
      }
    });
  }

  deleteProduct(product: Product) {
    const confirmation = window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm "${product.name}"?`);
    if (confirmation) {
      this.productService.deleteProduct(product.id).subscribe({
        next: () => {
          this.toastService.showToast({
            error: null,
            defaultMsg: 'Xóa sản phẩm thành công',
            title: 'Thành công'
          });
          this.getProducts();
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.showToast({
            error: error,
            defaultMsg: 'Lỗi khi xóa sản phẩm',
            title: 'Lỗi'
          });
        }
      });
    }
  }
}