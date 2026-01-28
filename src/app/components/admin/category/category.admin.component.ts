import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Category } from '../../../models/category';
import { CategoryService, CategoryDTO } from '../../../services/category.service';
import { ApiResponse } from '../../../responses/api.response';
import { ToastService } from '../../../services/toast.service';
import { HttpErrorResponse } from '@angular/common/http';

// Tree node with expand state and children
interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
  expanded: boolean;
  level: number;
}

@Component({
  selector: 'app-category-admin',
  templateUrl: './category.admin.component.html',
  styleUrls: ['./category.admin.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class CategoryAdminComponent implements OnInit {
  categories: Category[] = [];
  categoryTree: CategoryTreeNode[] = [];
  flattenedTree: CategoryTreeNode[] = [];
  parentCategories: Category[] = [];
  loading = false;
  keyword = '';

  // Phân trang
  currentPage = 0;
  itemsPerPage = 20;
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
        this.buildCategoryTree();
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

  // =============== TREE BUILDING ===============
  buildCategoryTree(): void {
    // Convert flat list to tree structure
    const nodeMap = new Map<number, CategoryTreeNode>();
    const rootNodes: CategoryTreeNode[] = [];

    // Create nodes
    for (const cat of this.categories) {
      const node: CategoryTreeNode = {
        ...cat,
        children: [],
        expanded: true, // Default expanded
        level: 0
      };
      nodeMap.set(cat.id, node);
    }

    // Build hierarchy
    for (const cat of this.categories) {
      const node = nodeMap.get(cat.id)!;
      if (cat.parentId && nodeMap.has(cat.parentId)) {
        const parent = nodeMap.get(cat.parentId)!;
        parent.children.push(node);
        node.level = parent.level + 1;
      } else {
        rootNodes.push(node);
      }
    }

    // Sort children alphabetically
    const sortChildren = (nodes: CategoryTreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      for (const node of nodes) {
        if (node.children.length > 0) {
          sortChildren(node.children);
        }
      }
    };
    sortChildren(rootNodes);

    this.categoryTree = rootNodes;
    this.flattenTree();
  }

  flattenTree(): void {
    const result: CategoryTreeNode[] = [];

    const traverse = (nodes: CategoryTreeNode[], level: number) => {
      for (const node of nodes) {
        node.level = level;

        // Apply keyword filter
        if (this.keyword.trim()) {
          const kw = this.keyword.toLowerCase();
          const matches = node.name.toLowerCase().includes(kw);
          const childMatches = this.hasMatchingChild(node, kw);
          if (!matches && !childMatches) continue;
        }

        result.push(node);

        if (node.expanded && node.children.length > 0) {
          traverse(node.children, level + 1);
        }
      }
    };

    traverse(this.categoryTree, 0);

    // Pagination
    this.totalPages = Math.ceil(result.length / this.itemsPerPage);
    if (this.currentPage >= this.totalPages) {
      this.currentPage = Math.max(0, this.totalPages - 1);
    }
    const start = this.currentPage * this.itemsPerPage;
    this.flattenedTree = result.slice(start, start + this.itemsPerPage);
    this.updateVisiblePages();
  }

  hasMatchingChild(node: CategoryTreeNode, keyword: string): boolean {
    for (const child of node.children) {
      if (child.name.toLowerCase().includes(keyword)) return true;
      if (this.hasMatchingChild(child, keyword)) return true;
    }
    return false;
  }

  // =============== EXPAND/COLLAPSE ===============
  toggleExpand(node: CategoryTreeNode): void {
    node.expanded = !node.expanded;
    this.flattenTree();
  }

  expandAll(): void {
    const setExpanded = (nodes: CategoryTreeNode[], expanded: boolean) => {
      for (const node of nodes) {
        node.expanded = expanded;
        if (node.children.length > 0) {
          setExpanded(node.children, expanded);
        }
      }
    };
    setExpanded(this.categoryTree, true);
    this.flattenTree();
  }

  collapseAll(): void {
    const setExpanded = (nodes: CategoryTreeNode[], expanded: boolean) => {
      for (const node of nodes) {
        node.expanded = expanded;
        if (node.children.length > 0) {
          setExpanded(node.children, expanded);
        }
      }
    };
    setExpanded(this.categoryTree, false);
    this.flattenTree();
  }

  // =============== PAGINATION ===============
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
    this.flattenTree();
  }

  search(): void {
    this.currentPage = 0;
    this.flattenTree();
  }

  // =============== MODAL ===============
  openCreateModal(parentNode?: CategoryTreeNode): void {
    this.modalMode = 'create';
    this.editingCategory = null;
    this.categoryForm = {
      name: '',
      parentId: parentNode ? parentNode.id : null,
      slug: ''
    };
    this.nameError = '';
    this.showModal = true;
  }

  openEditModal(category: CategoryTreeNode): void {
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

  // =============== VALIDATION ===============
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

  // =============== SAVE ===============
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

  // =============== DELETE ===============
  deleteCategory(category: CategoryTreeNode): void {
    const hasChildren = category.children && category.children.length > 0;
    const message = hasChildren
      ? `Danh mục "${category.name}" có ${category.children.length} danh mục con. Bạn có chắc muốn xóa?`
      : `Bạn có chắc muốn xóa danh mục "${category.name}"?`;

    if (!confirm(message)) return;

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

  // =============== HELPERS ===============
  getIndentStyle(level: number): object {
    return { 'padding-left': `${level * 24 + 12}px` };
  }
}