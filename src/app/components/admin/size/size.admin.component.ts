import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SizeService, SizeDTO } from '../../../services/size.service';
import { Size } from '../../../models/size';
import { ToastService } from '../../../services/toast.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-size-admin',
    templateUrl: './size.admin.component.html',
    styleUrls: ['./size.admin.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ]
})
export class SizeAdminComponent implements OnInit {
    // Danh sách size
    sizes: Size[] = [];
    filteredSizes: Size[] = [];
    loading: boolean = false;

    // Tìm kiếm và phân trang
    keyword: string = '';
    currentPage: number = 0;
    itemsPerPage: number = 10;
    totalPages: number = 0;
    visiblePages: number[] = [];

    // Modal
    showModal: boolean = false;
    modalMode: 'create' | 'edit' = 'create';
    selectedSize: Size | null = null;
    sizeForm: SizeDTO = { name: '', description: '' };
    saving: boolean = false;

    // Validation
    nameError: string = '';

    private sizeService = inject(SizeService);
    private toastService = inject(ToastService);

    ngOnInit() {
        this.loadSizes();
    }

    // Tải danh sách
    loadSizes() {
        this.loading = true;
        this.sizeService.getAllSizes().subscribe({
            next: (response) => {
                this.loading = false;
                if (response.data) {
                    this.sizes = response.data;
                    this.applyFilter();
                }
            },
            error: (err: HttpErrorResponse) => {
                this.loading = false;
                this.toastService.showToast({
                    title: 'Lỗi',
                    defaultMsg: 'Lỗi tải danh sách size',
                    error: err
                });
            }
        });
    }

    // Lọc và phân trang
    applyFilter() {
        let filtered = this.sizes;
        if (this.keyword.trim()) {
            const kw = this.keyword.toLowerCase();
            filtered = this.sizes.filter(s => s.name.toLowerCase().includes(kw));
        }
        this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        if (this.currentPage >= this.totalPages) {
            this.currentPage = Math.max(0, this.totalPages - 1);
        }
        const start = this.currentPage * this.itemsPerPage;
        this.filteredSizes = filtered.slice(start, start + this.itemsPerPage);
        this.visiblePages = this.generateVisiblePageArray(this.currentPage, this.totalPages);
    }

    // Tạo mảng trang hiển thị
    generateVisiblePageArray(currentPage: number, totalPages: number): number[] {
        const maxVisible = 5;
        let start = Math.max(1, currentPage + 1 - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    // Tìm kiếm
    search() {
        this.currentPage = 0;
        this.applyFilter();
    }

    // Chuyển trang
    onPageChange(page: number) {
        this.currentPage = page;
        this.applyFilter();
    }

    // Mở modal thêm mới
    openCreateModal() {
        this.modalMode = 'create';
        this.selectedSize = null;
        this.sizeForm = { name: '', description: '' };
        this.nameError = '';
        this.showModal = true;
    }

    // Mở modal sửa
    openEditModal(size: Size) {
        this.modalMode = 'edit';
        this.selectedSize = size;
        this.sizeForm = {
            name: size.name,
            description: size.description || ''
        };
        this.nameError = '';
        this.showModal = true;
    }

    // Đóng modal
    closeModal() {
        this.showModal = false;
        this.selectedSize = null;
        this.sizeForm = { name: '', description: '' };
    }

    // Validate
    validateName(): boolean {
        if (!this.sizeForm.name || this.sizeForm.name.trim() === '') {
            this.nameError = 'Vui lòng nhập tên size';
            return false;
        }
        this.nameError = '';
        return true;
    }

    // Lưu
    saveSize() {
        if (!this.validateName()) return;
        this.saving = true;

        if (this.modalMode === 'create') {
            this.sizeService.createSize(this.sizeForm).subscribe({
                next: () => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Thành công',
                        defaultMsg: 'Tạo size thành công'
                    });
                    this.closeModal();
                    this.loadSizes();
                },
                error: (err: HttpErrorResponse) => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Lỗi',
                        defaultMsg: err.error?.message || 'Lỗi tạo size',
                        error: err
                    });
                }
            });
        } else if (this.selectedSize) {
            this.sizeService.updateSize(this.selectedSize.id, this.sizeForm).subscribe({
                next: () => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Thành công',
                        defaultMsg: 'Cập nhật size thành công'
                    });
                    this.closeModal();
                    this.loadSizes();
                },
                error: (err: HttpErrorResponse) => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Lỗi',
                        defaultMsg: err.error?.message || 'Lỗi cập nhật size',
                        error: err
                    });
                }
            });
        }
    }

    // Xóa
    deleteSize(size: Size) {
        if (!confirm(`Bạn có chắc muốn xóa size "${size.name}"?`)) return;

        this.sizeService.deleteSize(size.id).subscribe({
            next: () => {
                this.toastService.showToast({
                    title: 'Thành công',
                    defaultMsg: 'Xóa size thành công'
                });
                this.loadSizes();
            },
            error: (err: HttpErrorResponse) => {
                this.toastService.showToast({
                    title: 'Lỗi',
                    defaultMsg: err.error?.message || 'Lỗi xóa size',
                    error: err
                });
            }
        });
    }
}
