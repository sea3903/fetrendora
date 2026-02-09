import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ColorService, ColorDTO } from '../../../services/color.service';
import { Color } from '../../../models/color';
import { ToastService } from '../../../services/toast.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-color-admin',
    templateUrl: './color.admin.component.html',
    styleUrls: ['./color.admin.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ]
})
export class ColorAdminComponent implements OnInit {
    // Danh sách màu
    colors: Color[] = [];
    filteredColors: Color[] = [];
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
    selectedColor: Color | null = null;
    colorForm: ColorDTO = { name: '', code: '#000000' };
    saving: boolean = false;

    // Validation
    nameError: string = '';

    private colorService = inject(ColorService);
    private toastService = inject(ToastService);

    ngOnInit() {
        this.loadColors();
    }

    // Tải danh sách màu
    loadColors() {
        this.loading = true;
        this.colorService.getAllColors().subscribe({
            next: (response) => {
                this.loading = false;
                if (response.data) {
                    this.colors = response.data;
                    this.applyFilter();
                }
            },
            error: (err: HttpErrorResponse) => {
                this.loading = false;
                this.toastService.showToast({
                    title: 'Lỗi',
                    defaultMsg: 'Lỗi tải danh sách màu',
                    error: err
                });
            }
        });
    }

    // Lọc và phân trang
    applyFilter() {
        let filtered = this.colors;
        if (this.keyword.trim()) {
            const kw = this.keyword.toLowerCase();
            filtered = this.colors.filter(c => c.name.toLowerCase().includes(kw));
        }
        this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        if (this.currentPage >= this.totalPages) {
            this.currentPage = Math.max(0, this.totalPages - 1);
        }
        const start = this.currentPage * this.itemsPerPage;
        this.filteredColors = filtered.slice(start, start + this.itemsPerPage);
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
        this.selectedColor = null;
        this.colorForm = { name: '', code: '#000000' };
        this.nameError = '';
        this.showModal = true;
    }

    // Mở modal sửa
    openEditModal(color: Color) {
        this.modalMode = 'edit';
        this.selectedColor = color;
        this.colorForm = {
            name: color.name,
            code: color.code || '#000000'
        };
        this.nameError = '';
        this.showModal = true;
    }

    // Đóng modal
    closeModal() {
        this.showModal = false;
        this.selectedColor = null;
        this.colorForm = { name: '', code: '#000000' };
    }

    // Validate tên màu
    validateName(): boolean {
        const name = (this.colorForm.name || '').trim();
        if (!name) {
            this.nameError = 'Vui lòng nhập tên màu';
            return false;
        }

        // Kiểm tra trùng tên (Sử dụng Normalization để loại bỏ dấu: Trắng == Trang)
        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const inputName = normalize(name);

        const isDuplicate = this.colors.some(c =>
            normalize(c.name.trim()) === inputName &&
            (this.modalMode === 'create' || c.id !== this.selectedColor?.id)
        );

        if (isDuplicate) {
            this.nameError = 'Tên màu đã tồn tại';
            return false;
        }

        this.nameError = '';
        return true;
    }

    // Lưu màu
    saveColor() {
        if (!this.validateName()) return;
        this.saving = true;

        if (this.modalMode === 'create') {
            this.colorService.createColor(this.colorForm).subscribe({
                next: () => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Thành công',
                        defaultMsg: 'Tạo màu thành công'
                    });
                    this.closeModal();
                    this.loadColors();
                },
                error: (err: HttpErrorResponse) => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Lỗi',
                        defaultMsg: err.error?.message || 'Lỗi tạo màu',
                        error: err
                    });
                }
            });
        } else if (this.selectedColor) {
            this.colorService.updateColor(this.selectedColor.id, this.colorForm).subscribe({
                next: () => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Thành công',
                        defaultMsg: 'Cập nhật màu thành công'
                    });
                    this.closeModal();
                    this.loadColors();
                },
                error: (err: HttpErrorResponse) => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: 'Lỗi',
                        defaultMsg: err.error?.message || 'Lỗi cập nhật màu',
                        error: err
                    });
                }
            });
        }
    }

    // Xóa màu
    deleteColor(color: Color) {
        if (!confirm(`Bạn có chắc muốn xóa màu "${color.name}"?`)) return;

        this.colorService.deleteColor(color.id).subscribe({
            next: () => {
                this.toastService.showToast({
                    title: 'Thành công',
                    defaultMsg: 'Xóa màu thành công'
                });
                this.loadColors();
            },
            error: (err: HttpErrorResponse) => {
                this.toastService.showToast({
                    title: 'Lỗi',
                    defaultMsg: err.error?.message || 'Lỗi xóa màu',
                    error: err
                });
            }
        });
    }
}
