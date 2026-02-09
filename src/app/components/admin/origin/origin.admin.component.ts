import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OriginService, OriginDTO } from '../../../services/origin.service';
import { Origin } from '../../../models/origin';
import { ToastService } from '../../../services/toast.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-origin-admin',
    templateUrl: './origin.admin.component.html',
    styleUrls: ['./origin.admin.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ]
})
export class OriginAdminComponent implements OnInit {
    // Danh sách xuất xứ
    origins: Origin[] = [];
    filteredOrigins: Origin[] = [];
    loading: boolean = false;

    // Tìm kiếm và phân trang
    keyword: string = '';
    currentPage: number = 0;
    itemsPerPage: number = 10;
    totalPages: number = 0;
    visiblePages: number[] = [];

    // Hình ảnh mặc định
    defaultFlag: string = 'assets/images/flag-placeholder.svg';

    // Modal
    showModal: boolean = false;
    modalMode: 'create' | 'edit' = 'create';
    selectedOrigin: Origin | null = null;
    originForm: OriginDTO = { name: '', code: '' };
    saving: boolean = false;

    // Validation
    nameError: string = '';

    private originService = inject(OriginService);
    private toastService = inject(ToastService);

    ngOnInit() {
        this.loadOrigins();
    }

    // Tải danh sách
    loadOrigins() {
        this.loading = true;
        this.originService.getAllOrigins().subscribe({
            next: (response) => {
                this.loading = false;
                if (response.data) {
                    this.origins = response.data;
                    this.applyFilter();
                }
            },
            error: (err: HttpErrorResponse) => {
                this.loading = false;
                this.toastService.showToast({
                    title: 'Lỗi',
                    defaultMsg: 'Lỗi tải danh sách xuất xứ',
                    error: err
                });
            }
        });
    }

    // Lấy URL quốc kỳ từ flagcdn.com
    getFlagUrl(origin: Origin): string {
        if (origin.code) {
            return `https://flagcdn.com/w80/${origin.code.toLowerCase()}.png`;
        }
        return this.defaultFlag;
    }

    // Lấy URL preview quốc kỳ trong form
    getPreviewFlagUrl(): string {
        if (this.originForm.code) {
            return `https://flagcdn.com/w160/${this.originForm.code.toLowerCase()}.png`;
        }
        return '';
    }

    // Lọc và phân trang
    applyFilter() {
        let filtered = this.origins;
        if (this.keyword.trim()) {
            const kw = this.keyword.toLowerCase();
            filtered = this.origins.filter(o => o.name.toLowerCase().includes(kw));
        }
        this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        if (this.currentPage >= this.totalPages) {
            this.currentPage = Math.max(0, this.totalPages - 1);
        }
        const start = this.currentPage * this.itemsPerPage;
        this.filteredOrigins = filtered.slice(start, start + this.itemsPerPage);
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
        this.selectedOrigin = null;
        this.originForm = { name: '', code: '' };
        this.nameError = '';
        this.showModal = true;
    }

    // Mở modal sửa
    openEditModal(origin: Origin) {
        this.modalMode = 'edit';
        this.selectedOrigin = origin;
        this.originForm = {
            name: origin.name,
            code: origin.code || ''
        };
        this.nameError = '';
        this.showModal = true;
    }

    // Đóng modal
    closeModal() {
        this.showModal = false;
        this.selectedOrigin = null;
        this.originForm = { name: '', code: '' };
    }

    // Validate
    validateName(): boolean {
        const name = (this.originForm.name || '').trim();
        if (!name) {
            this.nameError = 'Vui lòng nhập tên xuất xứ';
            return false;
        }

        // Kiểm tra trùng tên (Sử dụng Normalization: Mỹ == My)
        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const inputName = normalize(name);

        const isDuplicate = this.origins.some(o =>
            normalize(o.name.trim()) === inputName &&
            (this.modalMode === 'create' || o.id !== this.selectedOrigin?.id)
        );

        if (isDuplicate) {
            this.nameError = 'Tên xuất xứ đã tồn tại';
            return false;
        }

        this.nameError = '';
        return true;
    }

    // Lưu
    saveOrigin() {
        if (!this.validateName()) return;
        this.saving = true;

        // Đảm bảo code là uppercase
        if (this.originForm.code) {
            this.originForm.code = this.originForm.code.toUpperCase();
        }

        if (this.modalMode === 'create') {
            this.originService.createOrigin(this.originForm).subscribe({
                next: () => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Thành công',
                        defaultMsg: 'Tạo xuất xứ thành công'
                    });
                    this.closeModal();
                    this.loadOrigins();
                },
                error: (err: HttpErrorResponse) => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Lỗi',
                        defaultMsg: err.error?.message || 'Lỗi tạo xuất xứ',
                        error: err
                    });
                }
            });
        } else if (this.selectedOrigin) {
            this.originService.updateOrigin(this.selectedOrigin.id, this.originForm).subscribe({
                next: () => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Thành công',
                        defaultMsg: 'Cập nhật xuất xứ thành công'
                    });
                    this.closeModal();
                    this.loadOrigins();
                },
                error: (err: HttpErrorResponse) => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Lỗi',
                        defaultMsg: err.error?.message || 'Lỗi cập nhật xuất xứ',
                        error: err
                    });
                }
            });
        }
    }

    // Xóa
    deleteOrigin(origin: Origin) {
        if (!confirm(`Bạn có chắc muốn xóa xuất xứ "${origin.name}"?`)) return;

        this.originService.deleteOrigin(origin.id).subscribe({
            next: () => {
                this.toastService.showToast({
                    title: 'Thành công',
                    defaultMsg: 'Xóa xuất xứ thành công'
                });
                this.loadOrigins();
            },
            error: (err: HttpErrorResponse) => {
                this.toastService.showToast({
                    title: 'Lỗi',
                    defaultMsg: err.error?.message || 'Lỗi xóa xuất xứ',
                    error: err
                });
            }
        });
    }
}
