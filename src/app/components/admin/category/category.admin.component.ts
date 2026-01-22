import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Category } from '../../../models/category';
import { CategoryService, CategoryDTO } from '../../../services/category.service';
import { ApiResponse } from '../../../responses/api.response';
import { ToastService } from '../../../services/toast.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-category-admin',
  templateUrl: './category.admin.component.html',
  styleUrls: ['./category.admin.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class CategoryAdminComponent implements OnInit {
  categories: Category[] = [];
  filteredCategories: Category[] = [];
  parentCategories: Category[] = [];
  loading = false;
  keyword = '';

  // Phân trang
  currentPage = 0;
  itemsPerPage = 10;
  totalPages = 0;
  visiblePages: number[] = [];

  // Modal
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  saving = false;
  editingCategory: Category | null = null;

  // Form
  categoryForm: CategoryDTO = {
    name: '',
    parentId: null,
    slug: ''
  };

  // Validation
  nameError = '';

  private categoryService = inject(CategoryService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.categoryService.getCategories().subscribe({
      next: (response: ApiResponse) => {
        this.categories = response.data || [];
        this.parentCategories = this.categories.filter(c => !c.parentId);
        this.applyFilter();
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.toastService.showToast({
          title: 'Lỗi',
          defaultMsg: 'Không thể tải danh sách danh mục',
          error: error
        });
      }
    });
  }

  applyFilter(): void {
    let filtered = [...this.categories];

    if (this.keyword.trim()) {
      const kw = this.keyword.toLowerCase().trim();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(kw));
    }

    // Sắp xếp: danh mục cha trước, con sau
    filtered.sort((a, b) => {
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      return a.name.localeCompare(b.name);
    });

    // Phân trang
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    if (this.currentPage >= this.totalPages) {
      this.currentPage = Math.max(0, this.totalPages - 1);
    }
    const start = this.currentPage * this.itemsPerPage;
    this.filteredCategories = filtered.slice(start, start + this.itemsPerPage);
    this.updateVisiblePages();
  }

  updateVisiblePages(): void {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage + 1 - Math.floor(maxVisible / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    this.visiblePages = pages;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFilter();
  }

  search(): void {
    this.currentPage = 0;
    this.applyFilter();
  }

  // Modal
  openCreateModal(): void {
    this.modalMode = 'create';
    this.editingCategory = null;
    this.categoryForm = { name: '', parentId: null, slug: '' };
    this.nameError = '';
    this.showModal = true;
  }

  openEditModal(category: Category): void {
    this.modalMode = 'edit';
    this.editingCategory = category;
    this.categoryForm = {
      name: category.name,
      parentId: category.parentId || null,
      slug: category.slug || ''
    };
    this.nameError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingCategory = null;
  }

  // Validation
  validateName(): boolean {
    if (!this.categoryForm.name || !this.categoryForm.name.trim()) {
      this.nameError = 'Tên danh mục không được để trống';
      return false;
    }
    if (this.categoryForm.name.trim().length < 2) {
      this.nameError = 'Tên danh mục phải có ít nhất 2 ký tự';
      return false;
    }
    if (this.categoryForm.name.trim().length > 50) {
      this.nameError = 'Tên danh mục không được quá 50 ký tự';
      return false;
    }
    this.nameError = '';
    return true;
  }

  // Save
  saveCategory(): void {
    if (!this.validateName()) return;

    this.saving = true;
    const dto: CategoryDTO = {
      name: this.categoryForm.name.trim(),
      parentId: this.categoryForm.parentId,
      slug: this.categoryForm.slug?.trim() || ''
    };

    if (this.modalMode === 'create') {
      this.categoryService.createCategory(dto).subscribe({
        next: () => {
          this.saving = false;
          this.toastService.showToast({
            title: 'Thành công',
            defaultMsg: 'Thêm danh mục thành công'
          });
          this.closeModal();
          this.loadCategories();
        },
        error: (error: HttpErrorResponse) => {
          this.saving = false;
          this.toastService.showToast({
            title: 'Lỗi',
            defaultMsg: error.error?.message || 'Lỗi khi thêm danh mục',
            error: error
          });
        }
      });
    } else {
      this.categoryService.updateCategory(this.editingCategory!.id, dto).subscribe({
        next: () => {
          this.saving = false;
          this.toastService.showToast({
            title: 'Thành công',
            defaultMsg: 'Cập nhật danh mục thành công'
          });
          this.closeModal();
          this.loadCategories();
        },
        error: (error: HttpErrorResponse) => {
          this.saving = false;
          this.toastService.showToast({
            title: 'Lỗi',
            defaultMsg: error.error?.message || 'Lỗi khi cập nhật danh mục',
            error: error
          });
        }
      });
    }
  }

  // Delete
  deleteCategory(category: Category): void {
    if (!confirm(`Bạn có chắc muốn xóa danh mục "${category.name}"?`)) return;

    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {
        this.toastService.showToast({
          title: 'Thành công',
          defaultMsg: 'Xóa danh mục thành công'
        });
        this.loadCategories();
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          title: 'Lỗi',
          defaultMsg: error.error?.message || 'Lỗi khi xóa danh mục',
          error: error
        });
      }
    });
  }
}