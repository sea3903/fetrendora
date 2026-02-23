import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BaseComponent } from '../base/base.component';
import { BrandService } from '../../services/brand.service';
import { ColorService } from '../../services/color.service';
import { SizeService } from '../../services/size.service';
import { OriginService } from '../../services/origin.service';
import { Product } from '../../models/product';
import { Category } from '../../models/category';
import { ApiResponse } from '../../responses/api.response';
import { environment } from '../../../environments/environment';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-category-products',
    templateUrl: './category-products.component.html',
    styleUrls: ['./category-products.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        HeaderComponent,
        FooterComponent
    ]
})
export class CategoryProductsComponent extends BaseComponent implements OnInit {
    // Danh mục
    categoryId: number = 0;
    currentCategory: any = null;
    parentCategory: any = null;
    siblingCategories: any[] = [];

    // Sản phẩm & phân trang
    products: Product[] = [];
    totalProducts: number = 0;
    currentPage: number = 0;
    itemsPerPage: number = 12;
    totalPages: number = 0;
    visiblePages: number[] = [];
    isLoading: boolean = false;

    // Bộ lọc
    brands: any[] = [];
    colors: any[] = [];
    sizes: any[] = [];
    origins: any[] = [];

    selectedBrandId: number | null = null;
    selectedColorIds: number[] = [];
    selectedSizeIds: number[] = [];
    selectedOriginIds: number[] = [];
    minPrice: number | null = null;
    maxPrice: number | null = null;

    // UI
    showMobileFilter: boolean = false;
    expandedFilters: { [key: string]: boolean } = {
        brand: true,
        color: true,
        size: true,
        origin: true,
        price: true,
    };

    // Services (categoryService, activatedRoute, productService, router, toastService kế thừa từ BaseComponent)
    private brandService = inject(BrandService);
    private colorService = inject(ColorService);
    private sizeService = inject(SizeService);
    private originService = inject(OriginService);

    apiBaseUrl = environment.apiBaseUrl;

    ngOnInit(): void {
        // Lắng nghe route param thay đổi
        this.activatedRoute.params.subscribe((params) => {
            this.categoryId = +params['id'];
            this.currentPage = 0;
            this.resetFilters();
            this.loadCategoryInfo();
            this.loadProducts();
        });
        this.loadFilterData();
    }

    // ══════════════════════════════════════
    // DANH MỤC
    // ══════════════════════════════════════
    loadCategoryInfo(): void {
        this.categoryService.getCategoryById(this.categoryId).subscribe({
            next: (res: ApiResponse) => {
                this.currentCategory = res.data;
                // Nếu có parent, tải danh mục cha và các anh em
                if (this.currentCategory?.parent_id) {
                    this.categoryService
                        .getCategoryById(this.currentCategory.parent_id)
                        .subscribe({
                            next: (parentRes: ApiResponse) => {
                                this.parentCategory = parentRes.data;
                            },
                        });
                    this.categoryService
                        .getChildCategories(this.currentCategory.parent_id)
                        .subscribe({
                            next: (res: ApiResponse) => {
                                this.siblingCategories = (res.data || []).filter(
                                    (c: any) => c.id !== this.categoryId
                                );
                            },
                        });
                } else {
                    this.parentCategory = null;
                    this.siblingCategories = [];
                }
            },
        });
    }

    // ══════════════════════════════════════
    // SẢN PHẨM
    // ══════════════════════════════════════
    loadProducts(): void {
        this.isLoading = true;
        this.productService
            .getProductsWithFilters({
                categoryId: this.categoryId,
                page: this.currentPage,
                limit: this.itemsPerPage,
                active: true,
                brandId: this.selectedBrandId ?? undefined,
                colorIds: this.selectedColorIds.length > 0 ? this.selectedColorIds : undefined,
                sizeIds: this.selectedSizeIds.length > 0 ? this.selectedSizeIds : undefined,
                originIds: this.selectedOriginIds.length > 0 ? this.selectedOriginIds : undefined,
                minPrice: this.minPrice ?? undefined,
                maxPrice: this.maxPrice ?? undefined,
            })
            .subscribe({
                next: (response: ApiResponse) => {
                    const data = response.data;
                    this.products = data.products.map((product: Product) => ({
                        ...product,
                        url: `${environment.apiBaseUrl}/products/images/${product.thumbnail}`,
                    }));
                    this.totalProducts = data.totalElements || data.products.length;
                    this.totalPages = data.totalPages || 1;
                    this.visiblePages = this.generateVisiblePageArray(
                        this.currentPage,
                        this.totalPages
                    );
                    this.isLoading = false;
                },
                error: (err: HttpErrorResponse) => {
                    this.isLoading = false;
                    this.toastService.showToast({
                        error: err,
                        defaultMsg: 'Lỗi tải sản phẩm',
                        title: 'Lỗi',
                    });
                },
            });
    }

    // ══════════════════════════════════════
    // BỘ LỌC
    // ══════════════════════════════════════
    loadFilterData(): void {
        this.brandService.getAllBrands().subscribe({
            next: (res: ApiResponse) => (this.brands = res.data || []),
        });
        this.colorService.getAllColors().subscribe({
            next: (res: ApiResponse) => (this.colors = res.data || []),
        });
        this.sizeService.getAllSizes().subscribe({
            next: (res: ApiResponse) => (this.sizes = res.data || []),
        });
        this.originService.getAllOrigins().subscribe({
            next: (res: ApiResponse) => (this.origins = res.data || []),
        });
    }

    toggleBrand(brandId: number): void {
        this.selectedBrandId = this.selectedBrandId === brandId ? null : brandId;
        this.currentPage = 0;
        this.loadProducts();
    }

    toggleColor(colorId: number): void {
        const idx = this.selectedColorIds.indexOf(colorId);
        idx >= 0 ? this.selectedColorIds.splice(idx, 1) : this.selectedColorIds.push(colorId);
        this.currentPage = 0;
        this.loadProducts();
    }

    toggleSize(sizeId: number): void {
        const idx = this.selectedSizeIds.indexOf(sizeId);
        idx >= 0 ? this.selectedSizeIds.splice(idx, 1) : this.selectedSizeIds.push(sizeId);
        this.currentPage = 0;
        this.loadProducts();
    }

    toggleOrigin(originId: number): void {
        const idx = this.selectedOriginIds.indexOf(originId);
        idx >= 0 ? this.selectedOriginIds.splice(idx, 1) : this.selectedOriginIds.push(originId);
        this.currentPage = 0;
        this.loadProducts();
    }

    applyPriceFilter(): void {
        this.currentPage = 0;
        this.loadProducts();
    }

    resetFilters(): void {
        this.selectedBrandId = null;
        this.selectedColorIds = [];
        this.selectedSizeIds = [];
        this.selectedOriginIds = [];
        this.minPrice = null;
        this.maxPrice = null;
    }

    clearAllFilters(): void {
        this.resetFilters();
        this.currentPage = 0;
        this.loadProducts();
    }

    get activeFilterCount(): number {
        let count = 0;
        if (this.selectedBrandId) count++;
        count += this.selectedColorIds.length;
        count += this.selectedSizeIds.length;
        count += this.selectedOriginIds.length;
        if (this.minPrice != null || this.maxPrice != null) count++;
        return count;
    }

    toggleFilterSection(key: string): void {
        this.expandedFilters[key] = !this.expandedFilters[key];
    }

    // ══════════════════════════════════════
    // PHÂN TRANG & NAVIGATE
    // ══════════════════════════════════════
    changePage(page: number): void {
        if (page < 0 || page >= this.totalPages) return;
        this.currentPage = page;
        this.loadProducts();
        // Scroll lên đầu section sản phẩm
        const section = document.querySelector('.all-products-section');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    onProductClick(productId: number): void {
        this.router.navigate(['/products', productId]);
    }
}
