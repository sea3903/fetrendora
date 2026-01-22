import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BrandService, BrandDTO } from '../../../services/brand.service';
import { Brand } from '../../../models/brand';
import { ToastService } from '../../../services/toast.service';

import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-brand-admin',
    templateUrl: './brand.admin.component.html',
    styleUrls: ['./brand.admin.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ]
})
export class BrandAdminComponent implements OnInit {
    brands: Brand[] = [];
    keyword: string = '';
    currentPage: number = 0;
    itemsPerPage: number = 10;
    totalPages: number = 0;
    totalElements: number = 0;
    visiblePages: number[] = [];
    loading: boolean = false;

    // Default logo placeholder
    defaultLogo: string = 'assets/images/brand-placeholder.svg';

    // Modal state
    showModal: boolean = false;
    modalMode: 'create' | 'edit' = 'create';
    selectedBrand: Brand | null = null;
    brandForm: BrandDTO = { name: '', description: '' };
    selectedFile: File | null = null;
    previewUrl: string = '';
    saving: boolean = false;

    // Validation
    nameError: string = '';

    private brandService = inject(BrandService);
    private toastService = inject(ToastService);


    ngOnInit() {
        this.loadBrands();
    }

    // TrackBy function để tránh re-render và nháy ảnh
    trackById(index: number, brand: Brand): number {
        return brand.id;
    }

    // Lấy logo URL cho brand - dùng chung API /products/images như thumbnail
    getLogoUrl(brand: Brand): string {
        if (!brand.logoUrl) {
            return this.defaultLogo;
        }
        // Nếu là URL đầy đủ, dùng trực tiếp
        if (brand.logoUrl.startsWith('http://') || brand.logoUrl.startsWith('https://')) {
            return brand.logoUrl;
        }
        // Dùng chung API với products/images (đã permitAll sẵn)
        return `${environment.apiBaseUrl}/products/images/${brand.logoUrl}`;
    }

    loadBrands() {
        this.loading = true;
        this.brandService.getBrands(this.keyword, this.currentPage, this.itemsPerPage).subscribe({
            next: (response) => {
                this.loading = false;
                if (response.data) {
                    // Giữ nguyên data từ API, xử lý URL trong template
                    this.brands = response.data.brands;
                    this.totalPages = response.data.totalPages;
                    this.totalElements = response.data.totalElements;
                    this.visiblePages = this.generateVisiblePageArray(this.currentPage, this.totalPages);
                }
            },
            error: (err: HttpErrorResponse) => {
                this.loading = false;
                this.toastService.showToast({
                    title: 'Lỗi',
                    defaultMsg: 'Lỗi tải danh sách thương hiệu',
                    error: err
                });
            }
        });
    }

    searchBrands() {
        this.currentPage = 0;
        this.loadBrands();
    }

    onPageChange(page: number) {
        if (page < 0 || page >= this.totalPages) return;
        this.currentPage = page;
        this.loadBrands();
    }

    generateVisiblePageArray(currentPage: number, totalPages: number): number[] {
        const maxVisiblePages = 5;
        const halfVisiblePages = Math.floor(maxVisiblePages / 2);
        let startPage = Math.max(currentPage - halfVisiblePages, 0);
        let endPage = Math.min(startPage + maxVisiblePages - 1, totalPages - 1);
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(endPage - maxVisiblePages + 1, 0);
        }
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i + 1);
    }

    // ═══════════════════════════════════════════════════════════════
    // MODAL OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    openCreateModal() {
        this.modalMode = 'create';
        this.selectedBrand = null;
        this.brandForm = { name: '', description: '' };
        this.selectedFile = null;
        this.previewUrl = '';
        this.nameError = '';
        this.showModal = true;
    }

    openEditModal(brand: Brand) {
        this.modalMode = 'edit';
        this.selectedBrand = brand;
        this.brandForm = {
            name: brand.name,
            slug: brand.slug,
            description: brand.description || ''
        };
        this.selectedFile = null;
        // logoUrl đã được xử lý đầy đủ trong loadBrands
        this.previewUrl = brand.logoUrl || '';
        this.nameError = '';
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
        this.selectedBrand = null;
        this.selectedFile = null;
        this.previewUrl = '';
    }

    // ═══════════════════════════════════════════════════════════════
    // FILE HANDLING
    // ═══════════════════════════════════════════════════════════════
    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.previewUrl = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    onImageError(event: any) {
        event.target.src = 'assets/images/brand-placeholder.png';
    }

    // ═══════════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════════
    validateName(): boolean {
        if (!this.brandForm.name || this.brandForm.name.trim() === '') {
            this.nameError = 'Tên thương hiệu không được để trống';
            return false;
        }
        this.nameError = '';
        return true;
    }

    // ═══════════════════════════════════════════════════════════════
    // SAVE BRAND
    // ═══════════════════════════════════════════════════════════════
    saveBrand() {
        if (!this.validateName()) return;
        this.saving = true;

        if (this.modalMode === 'create') {
            this.brandService.createBrand(this.brandForm).subscribe({
                next: (response) => {
                    const newBrand = response.data as Brand;
                    if (this.selectedFile && newBrand) {
                        this.uploadLogoAndFinish(newBrand.id);
                    } else {
                        this.finishSave('Tạo thương hiệu thành công');
                    }
                },
                error: (err: HttpErrorResponse) => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Lỗi',
                        defaultMsg: err.error?.message || 'Lỗi tạo thương hiệu',
                        error: err
                    });
                }
            });
        } else if (this.selectedBrand) {
            this.brandService.updateBrand(this.selectedBrand.id, this.brandForm).subscribe({
                next: () => {
                    if (this.selectedFile) {
                        this.uploadLogoAndFinish(this.selectedBrand!.id);
                    } else {
                        this.finishSave('Cập nhật thương hiệu thành công');
                    }
                },
                error: (err: HttpErrorResponse) => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Lỗi',
                        defaultMsg: err.error?.message || 'Lỗi cập nhật thương hiệu',
                        error: err
                    });
                }
            });
        }
    }

    private uploadLogoAndFinish(brandId: number) {
        if (!this.selectedFile) {
            this.finishSave('Lưu thương hiệu thành công');
            return;
        }

        this.brandService.uploadLogo(brandId, this.selectedFile).subscribe({
            next: () => {
                this.finishSave('Lưu thương hiệu thành công');
            },
            error: (err: HttpErrorResponse) => {
                this.saving = false;
                this.toastService.showToast({
                    title: 'Lỗi',
                    defaultMsg: 'Lưu thông tin thành công, nhưng upload logo thất bại',
                    error: err
                });
                this.closeModal();
                this.loadBrands();
            }
        });
    }

    private finishSave(message: string) {
        this.saving = false;
        this.toastService.showToast({
            title: 'Thành công',
            defaultMsg: message
        });
        this.closeModal();
        this.loadBrands();
    }

    // ═══════════════════════════════════════════════════════════════
    // DELETE BRAND
    // ═══════════════════════════════════════════════════════════════
    deleteBrand(brand: Brand) {
        if (!confirm(`Bạn có chắc muốn xóa thương hiệu "${brand.name}"?`)) return;

        this.brandService.deleteBrand(brand.id).subscribe({
            next: () => {
                this.toastService.showToast({
                    title: 'Thành công',
                    defaultMsg: 'Xóa thương hiệu thành công'
                });
                this.loadBrands();
            },
            error: (err: HttpErrorResponse) => {
                this.toastService.showToast({
                    title: 'Lỗi',
                    defaultMsg: err.error?.message || 'Lỗi xóa thương hiệu',
                    error: err
                });
            }
        });
    }
}
