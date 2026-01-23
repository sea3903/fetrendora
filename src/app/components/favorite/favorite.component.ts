import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product';
import { ApiResponse } from '../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BaseComponent } from '../base/base.component';

@Component({
    selector: 'app-favorite',
    standalone: true,
    imports: [CommonModule, RouterModule, HeaderComponent, FooterComponent],
    templateUrl: './favorite.component.html',
    styleUrls: ['./favorite.component.scss']
})
export class FavoriteComponent extends BaseComponent implements OnInit {
    products: Product[] = [];
    loading: boolean = true;
    currentPage: number = 0;
    totalPage: number = 0;

    constructor() {
        super();
    }

    ngOnInit(): void {
        this.loadFavoriteProducts();
    }

    loadFavoriteProducts(): void {
        this.loading = true;
        this.productService.getFavoriteProducts().subscribe({
            next: (apiResponse: ApiResponse) => {
                const responseData = apiResponse.data || [];
                this.products = responseData.map((product: Product) => {
                    if (product.thumbnail) {
                        product.thumbnail = `${environment.apiBaseUrl}/products/images/${product.thumbnail}`;
                    }
                    return product;
                });
                this.loading = false;
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error loading favorites:', error);
                this.loading = false;
                // Nếu lỗi 401 thì ko cần báo lỗi, chỉ hiện trống
                if (error.status !== 401) {
                    this.toastService.showToast({
                        error: error,
                        defaultMsg: 'Không thể tải danh sách yêu thích',
                        title: 'Lỗi'
                    });
                }
            }
        });
    }

    removeFavorite(productId: number, event: Event): void {
        event.stopPropagation();
        event.preventDefault();

        this.productService.unlikeProduct(productId).subscribe({
            next: () => {
                this.products = this.products.filter(p => p.id !== productId);
                this.toastService.showToast({
                    error: null,
                    defaultMsg: 'Đã xóa khỏi danh sách yêu thích',
                    title: 'Thành công'
                });
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
