
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CouponService, Coupon } from '../../../services/coupon.service';
import { CategoryService } from '../../../services/category.service';
import { Category } from '../../../models/category';
import { Product } from '../../../models/product';
import { ProductService } from '../../../services/product.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-coupon',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './coupon.component.html',
  styleUrls: ['./coupon.component.scss']
})
export class CouponComponent implements OnInit {
  coupons: Coupon[] = [];
  filteredCoupons: Coupon[] = []; // For Search & Pagination
  paginatedCoupons: Coupon[] = []; // Displayed on current page
  categories: Category[] = [];

  // Pagination
  currentPage: number = 0;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  visiblePages: number[] = [];

  // Modal State
  showModal: boolean = false;
  modalMode: 'create' | 'update' = 'create';

  // Form
  couponForm: FormGroup;

  // Search
  couponSearchKeyword: string = '';

  // Product Selector
  products: Product[] = [];
  selectedProduct: Product | null = null;
  showProductSelector: boolean = false;
  productSearchKeyword: string = '';

  private couponService = inject(CouponService);
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  constructor() {
    this.couponForm = this.fb.group({
      id: [null],
      code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]+$/)]], // Uppercase only
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      active: [true],
      discount_type: ['PERCENT', Validators.required],
      discount_value: [0, [Validators.required, Validators.min(0)]],
      max_discount_amount: [0, [Validators.min(0)]],
      min_order_value: [0, [Validators.min(0)]],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      usage_limit: [100, [Validators.min(1)]],
      usage_limit_per_user: [1, [Validators.min(1)]],
      scope: ['global', Validators.required], // helper control for UI logic
      category_id: [null],
      product_id: [null]
    }, { validators: [this.dateRangeValidator, this.discountValidator, this.scopeValidator] });
  }

  ngOnInit(): void {
    this.getCoupons();
    this.getCategories();

    // Listen to scope changes to reset fields
    this.couponForm.get('scope')?.valueChanges.subscribe(scope => {
      if (scope === 'global') {
        this.couponForm.patchValue({ category_id: null, product_id: null }, { emitEvent: false });
        this.selectedProduct = null;
      } else if (scope === 'category') {
        this.couponForm.patchValue({ product_id: null }, { emitEvent: false });
        this.selectedProduct = null;
      } else if (scope === 'product') {
        this.couponForm.patchValue({ category_id: null }, { emitEvent: false });
      }
    });

    // Auto uppercase Code
    this.couponForm.get('code')?.valueChanges.subscribe(value => {
      if (value && typeof value === 'string') {
        const upper = value.toUpperCase();
        if (upper !== value) {
          this.couponForm.get('code')?.setValue(upper, { emitEvent: false });
        }
      }
    });
  }

  // --- Custom Validators ---
  dateRangeValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('start_date')?.value;
    const end = group.get('end_date')?.value;
    if (start && end) {
      if (new Date(start) >= new Date(end)) {
        return { dateRangeInvalid: true };
      }
    }
    return null;
  }

  discountValidator(group: AbstractControl): ValidationErrors | null {
    const type = group.get('discount_type')?.value;
    const value = group.get('discount_value')?.value;

    if (type === 'PERCENT') {
      if (value < 0 || value > 100) return { percentInvalid: true };
    } else {
      if (value < 0) return { amountInvalid: true };
    }
    return null;
  }

  scopeValidator(group: AbstractControl): ValidationErrors | null {
    const scope = group.get('scope')?.value;
    const catId = group.get('category_id')?.value;
    const prodId = group.get('product_id')?.value;

    if (scope === 'category' && !catId) return { categoryRequired: true };
    if (scope === 'product' && !prodId) return { productRequired: true };
    return null;
  }

  // --- Actions ---

  getCoupons() {
    this.couponService.getCoupons().subscribe({
      next: (response: ApiResponse) => {
        const rawData = response.data || [];

        // Process each coupon to fix data mapping
        this.coupons = rawData.map((c: any) => {
          // Extract IDs from nested objects (API returns category/product as objects)
          const categoryId = c.category?.id || c.categoryId || c.category_id || null;
          const productId = c.product?.id || c.productId || c.product_id || null;

          // Determine scope
          let scope: 'global' | 'category' | 'product' = 'global';
          if (productId && productId > 0) {
            scope = 'product';
          } else if (categoryId && categoryId > 0) {
            scope = 'category';
          }

          // Parse dates - API may return LocalDateTime as array or string
          const parseDate = (dateVal: any): Date | null => {
            if (!dateVal) return null;
            // If array format [2024, 1, 28, 10, 30, 0]
            if (Array.isArray(dateVal)) {
              const [year, month, day, hour = 0, minute = 0, second = 0] = dateVal;
              return new Date(year, month - 1, day, hour, minute, second);
            }
            // If string format
            if (typeof dateVal === 'string') {
              return new Date(dateVal.replace(' ', 'T'));
            }
            return null;
          };

          return {
            ...c,
            category_id: categoryId,
            product_id: productId,
            scope: scope,
            // Parse dates for Angular date pipe
            startDateParsed: parseDate(c.startDate || c.start_date),
            endDateParsed: parseDate(c.endDate || c.end_date),
            // Keep raw for edit form
            start_date: c.startDate || c.start_date,
            end_date: c.endDate || c.end_date,
            // Map discount fields
            discount_type: c.discountType || c.discount_type,
            discount_value: c.discountValue || c.discount_value,
            // Category and product names for display
            categoryName: c.category?.name || '',
            productName: c.product?.name || ''
          };
        });

        this.searchCoupons(); // Trigger pagination init
      },
      error: (error) => {
        this.toastService.showToast({ error: error, defaultMsg: 'Không thể tải danh sách', title: 'Lỗi' });
      }
    });
  }

  getCategories() {
    this.categoryService.getCategories().subscribe({
      next: (res: ApiResponse) => this.categories = res.data,
      error: (err) => console.error(err)
    });
  }

  // Search & Pagination Logic
  searchCoupons() {
    const keyword = this.couponSearchKeyword.toLowerCase().trim();
    if (!keyword) {
      this.filteredCoupons = [...this.coupons];
    } else {
      this.filteredCoupons = this.coupons.filter(c =>
        c.code.toLowerCase().includes(keyword) ||
        c.name.toLowerCase().includes(keyword)
      );
    }
    this.currentPage = 0;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredCoupons.length / this.itemsPerPage);
    if (this.totalPages === 0) this.totalPages = 1;
    this.visiblePages = this.getVisiblePages();

    const startIndex = this.currentPage * this.itemsPerPage;
    this.paginatedCoupons = this.filteredCoupons.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getVisiblePages(): number[] {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - 1);
    let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  // --- Modal Logic ---

  openCreateModal() {
    this.modalMode = 'create';
    this.couponForm.reset({
      active: true,
      discount_type: 'PERCENT',
      discount_value: 0,
      max_discount_amount: 0,
      min_order_value: 0,
      usage_limit: 100,
      usage_limit_per_user: 1,
      scope: 'global'
    });
    this.selectedProduct = null;
    this.showModal = true;
  }

  openEditModal(coupon: any) {
    try {
      this.modalMode = 'update';

      // Extract IDs from nested objects (API returns category/product as objects)
      const categoryId = coupon.category?.id || coupon.categoryId || coupon.category_id || null;
      const productId = coupon.product?.id || coupon.productId || coupon.product_id || null;

      // Determine scope based on which ID is present
      let scope: 'global' | 'category' | 'product' = 'global';
      if (productId && productId > 0) scope = 'product';
      else if (categoryId && categoryId > 0) scope = 'category';

      // Format Dates for datetime-local input (requires format: YYYY-MM-DDTHH:mm)
      const fmtDate = (dateVal: any): string => {
        if (!dateVal) return '';
        try {
          // Handle array format from Jackson LocalDateTime [2024, 1, 28, 10, 30]
          if (Array.isArray(dateVal)) {
            const [year, month, day, hour = 0, minute = 0] = dateVal;
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
          }
          // Handle string format
          if (typeof dateVal === 'string') {
            const dateStr = dateVal.replace(' ', 'T');
            return dateStr.substring(0, 16);
          }
          return '';
        } catch {
          return '';
        }
      };

      // Get raw date values
      const startDateRaw = coupon.startDate || coupon.start_date;
      const endDateRaw = coupon.endDate || coupon.end_date;

      this.couponForm.patchValue({
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description || '',
        active: coupon.active,
        discount_type: coupon.discountType || coupon.discount_type || 'PERCENT',
        discount_value: coupon.discountValue || coupon.discount_value || 0,
        max_discount_amount: coupon.maxDiscountAmount || coupon.max_discount_amount || 0,
        min_order_value: coupon.minOrderValue || coupon.min_order_value || 0,
        start_date: fmtDate(startDateRaw),
        end_date: fmtDate(endDateRaw),
        usage_limit: coupon.usageLimit || coupon.usage_limit || 100,
        usage_limit_per_user: coupon.usageLimitPerUser || coupon.usage_limit_per_user || 1,
        scope: scope,
        category_id: categoryId,
        product_id: productId
      });

      // Load product info if scope is product
      if (scope === 'product' && productId) {
        this.loadSelectedProductInfo(productId);
      } else {
        this.selectedProduct = null;
      }

      this.showModal = true;
    } catch (e) {
      console.error('Error opening edit modal', e);
      this.toastService.showToast({ defaultMsg: 'Lỗi khi mở form sửa', title: 'Lỗi Client' });
    }
  }

  closeModal() {
    this.showModal = false;
  }

  // --- Save Logic ---
  saveCoupon() {
    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      this.toastService.showToast({ error: null, defaultMsg: 'Vui lòng kiểm tra lại thông tin', title: 'Lỗi Form' });
      return;
    }

    const formValue = this.couponForm.value;

    // Format Dates for Payload (Add Seconds :00)
    const payload = { ...formValue };
    const dateStr = (d: string) => {
      if (!d) return null;
      return d.includes('T') ? d.replace('T', ' ') + ':00' : d + ':00';
    };
    payload.start_date = dateStr(formValue.start_date);
    payload.end_date = dateStr(formValue.end_date);

    // Clean data based on scope
    const scope = this.couponForm.get('scope')?.value;
    if (scope === 'global') {
      payload.category_id = null;
      payload.product_id = null;
    } else if (scope === 'category') {
      payload.product_id = null;
    } else if (scope === 'product') {
      payload.category_id = null;
    }

    // IMPORTANT: Backend might ignore 'scope' field, but we should not crash
    // Also ensuring ID is present for update

    if (this.modalMode === 'create') {
      this.couponService.createCoupon(payload).subscribe({
        next: () => {
          this.toastService.showToast({ defaultMsg: 'Tạo thành công', title: 'Hệ thống' });
          this.closeModal();
          this.getCoupons();
        },
        error: (err) => this.toastService.showToast({ error: err, defaultMsg: 'Tạo thất bại', title: 'Lỗi' })
      });
    } else {
      this.couponService.updateCoupon(payload.id, payload).subscribe({
        next: () => {
          this.toastService.showToast({ defaultMsg: 'Cập nhật thành công', title: 'Hệ thống' });
          this.closeModal();
          this.getCoupons();
        },
        error: (err) => this.toastService.showToast({ error: err, defaultMsg: 'Cập nhật thất bại', title: 'Lỗi' })
      });
    }
  }

  deleteCoupon(id: number) {
    if (confirm('Bạn chắc chắn muốn xóa mã này? Hành động không thể hoàn tác.')) {
      this.couponService.deleteCoupon(id).subscribe({
        next: () => {
          this.toastService.showToast({ defaultMsg: 'Xóa vĩnh viễn thành công', title: 'Hệ thống' });
          this.getCoupons();
        },
        error: (err) => this.toastService.showToast({ error: err, defaultMsg: 'Xóa thất bại', title: 'Lỗi' })
      });
    }
  }

  toggleActivation(coupon: Coupon) {
    // Logic: If currently Active (true) -> We want to Lock (active=false). Prompt "Khóa".
    // If currently Inactive (false) -> We want to Activate (active=true). Prompt "Mở khóa".
    const newStatus = !coupon.active;
    const action = newStatus ? 'Kích hoạt' : 'Tạm khóa';

    if (confirm(`Bạn có chắc muốn ${action} mã này không?`)) {
      const payload = { ...coupon, active: newStatus };
      this.couponService.updateCoupon(coupon.id!, payload).subscribe({
        next: () => {
          this.toastService.showToast({ defaultMsg: `${action} thành công`, title: 'Hệ thống' });
          this.getCoupons();
        },
        error: (err) => this.toastService.showToast({ error: err, defaultMsg: `${action} thất bại`, title: 'Lỗi' })
      });
    }
  }

  // --- Product Selector Logic ---
  openProductSelector() {
    this.productSearchKeyword = '';
    this.products = [];
    this.showProductSelector = true;
    this.searchProducts();
  }

  closeProductSelector() {
    this.showProductSelector = false;
  }

  searchProducts() {
    this.productService.getProducts(this.productSearchKeyword, 0, 0, 10).subscribe({
      next: (res: ApiResponse) => {
        this.products = res.data.products;
        this.products.forEach(p => {
          // Fix Image URL: using environment base or checking if already full URL
          if (p.thumbnail && !p.thumbnail.startsWith('http')) {
            p.url = `${environment.apiBaseUrl}/products/images/${p.thumbnail}`;
          } else {
            p.url = p.thumbnail || 'assets/no-image.png';
          }
        });
      }
    });
  }

  selectProduct(p: Product) {
    this.couponForm.patchValue({ product_id: p.id });
    this.selectedProduct = p;
    this.closeProductSelector();
  }

  loadSelectedProductInfo(id: number) {
    this.productService.getDetailProduct(id).subscribe({
      next: (res: ApiResponse) => {
        this.selectedProduct = res.data;
        if (this.selectedProduct) {
          if (this.selectedProduct.thumbnail && !this.selectedProduct.thumbnail.startsWith('http')) {
            this.selectedProduct.url = `${environment.apiBaseUrl}/products/images/${this.selectedProduct.thumbnail}`;
          } else {
            this.selectedProduct.url = this.selectedProduct.thumbnail || 'assets/no-image.png';
          }
        }
      },
      error: (err) => console.log('Could not load product info', err)
    });
  }
}
