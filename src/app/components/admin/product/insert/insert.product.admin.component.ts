import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { InsertProductDTO } from '../../../../dtos/product/insert.product.dto';
import { VariantItem } from '../../../../dtos/product/variant-item.dto';
import { Category } from '../../../../models/category';
import { Brand } from '../../../../models/brand';
import { ApiResponse } from '../../../../responses/api.response';
import { BaseComponent } from '../../../base/base.component';
import { BrandService } from '../../../../services/brand.service';
import { ColorService } from '../../../../services/color.service';
import { SizeService } from '../../../../services/size.service';
import { OriginService } from '../../../../services/origin.service';

interface AttributeValue {
  id: number;
  name: string;
  selected: boolean;
}

@Component({
  selector: 'app-insert-product-admin',
  templateUrl: './insert.product.admin.component.html',
  styleUrls: ['./insert.product.admin.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class InsertProductAdminComponent extends BaseComponent implements OnInit {
  constructor(
    private brandService: BrandService,
    private colorService: ColorService,
    private sizeService: SizeService,
    private originService: OriginService
  ) {
    super();
  }

  insertProductDTO: InsertProductDTO = {
    name: '',
    price: 0,
    description: '',
    category_id: 0,
    brand_id: undefined,
    sku: '',
    slug: '',
    selling_attributes: '',
    is_active: true,
    images: [],
    variants: []
  };

  categories: Category[] = [];
  brands: Brand[] = [];
  selectedFiles: File[] = [];
  loading: boolean = false;

  // Selling attribute (which one customer chooses when buying)
  sellingAttribute: string = '';

  // Display attributes: checkboxes to add as product info (not for customer selection)
  enableSize: boolean = false;
  enableColor: boolean = false;
  enableOrigin: boolean = false;

  // Selected display attribute values (single selection for display only)
  selectedSizeId?: number;
  selectedColorId?: number;
  selectedOriginId?: number;

  // Available attribute values from API
  allSizes: AttributeValue[] = [];
  allColors: AttributeValue[] = [];
  allOrigins: AttributeValue[] = [];

  // Variants table
  variants: VariantItem[] = [];

  errors: {
    name?: string;
    price?: string;
    category?: string;
    images?: string;
    variants?: string;
  } = {};

  ngOnInit() {
    this.loadCategories();
    this.loadBrands();
    this.loadSizes();
    this.loadColors();
    this.loadOrigins();
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (apiResponse: ApiResponse) => {
        this.categories = apiResponse.data;
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({ error, defaultMsg: 'Lỗi tải danh mục', title: 'Lỗi' });
      }
    });
  }

  loadBrands() {
    this.brandService.getAllBrands().subscribe({
      next: (apiResponse: ApiResponse) => {
        this.brands = apiResponse.data;
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({ error, defaultMsg: 'Lỗi tải thương hiệu', title: 'Lỗi' });
      }
    });
  }

  loadSizes() {
    this.sizeService.getAllSizes().subscribe({
      next: (apiResponse: ApiResponse) => {
        this.allSizes = (apiResponse.data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          selected: false
        }));
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({ error, defaultMsg: 'Lỗi tải kích thước', title: 'Lỗi' });
      }
    });
  }

  loadColors() {
    this.colorService.getAllColors().subscribe({
      next: (apiResponse: ApiResponse) => {
        this.allColors = (apiResponse.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          selected: false
        }));
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({ error, defaultMsg: 'Lỗi tải màu sắc', title: 'Lỗi' });
      }
    });
  }

  loadOrigins() {
    this.originService.getAllOrigins().subscribe({
      next: (apiResponse: ApiResponse) => {
        this.allOrigins = (apiResponse.data || []).map((o: any) => ({
          id: o.id,
          name: o.name,
          selected: false
        }));
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({ error, defaultMsg: 'Lỗi tải xuất xứ', title: 'Lỗi' });
      }
    });
  }

  // Auto-generate slug from product name
  onNameChange() {
    if (this.insertProductDTO.name) {
      this.insertProductDTO.slug = this.generateSlug(this.insertProductDTO.name);
    }
  }

  generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/-+/g, '-') // Remove consecutive -
      .trim();
  }

  onSellingAttributeChange() {
    // Reset attribute value selections when selling attribute changes
    this.allSizes.forEach(s => s.selected = false);
    this.allColors.forEach(c => c.selected = false);
    this.allOrigins.forEach(o => o.selected = false);
    this.variants = [];
  }

  onAttributeValueChange() {
    this.rebuildVariantsTable();
  }

  // Check if selling attribute is set
  hasSellingAttribute(): boolean {
    return this.sellingAttribute !== '';
  }

  // Check if attribute is the selling one
  isSellingAttribute(attr: string): boolean {
    return this.sellingAttribute.includes(attr);
  }

  rebuildVariantsTable() {
    this.variants = [];
    const basePrice = this.insertProductDTO.price || 0;

    // Get selected values for selling attribute(s)
    const selectedSizes = this.isSellingAttribute('SIZE') ? this.allSizes.filter(s => s.selected) : [];
    const selectedColors = this.isSellingAttribute('COLOR') ? this.allColors.filter(c => c.selected) : [];
    const selectedOrigins = this.isSellingAttribute('ORIGIN') ? this.allOrigins.filter(o => o.selected) : [];

    // Build arrays for cartesian product
    const arrays: { type: string; values: AttributeValue[] }[] = [];
    if (selectedSizes.length > 0) arrays.push({ type: 'size', values: selectedSizes });
    if (selectedColors.length > 0) arrays.push({ type: 'color', values: selectedColors });
    if (selectedOrigins.length > 0) arrays.push({ type: 'origin', values: selectedOrigins });

    if (arrays.length === 0) return;

    // Calculate cartesian product
    const valueArrays = arrays.map(a => a.values);
    const combinations = this.cartesianProduct(...valueArrays);

    combinations.forEach(combo => {
      const variant: VariantItem = {
        price: basePrice,
        stock_quantity: 0
      };

      // Add selling attribute values
      combo.forEach((val: AttributeValue, idx: number) => {
        const type = arrays[idx].type;
        if (type === 'size') {
          variant.size_id = val.id;
          variant.size_name = val.name;
        } else if (type === 'color') {
          variant.color_id = val.id;
          variant.color_name = val.name;
        } else if (type === 'origin') {
          variant.origin_id = val.id;
          variant.origin_name = val.name;
        }
      });

      // Add display attribute values (single selection, not for selling)
      if (!this.isSellingAttribute('SIZE') && this.enableSize && this.selectedSizeId) {
        const sizeObj = this.allSizes.find(s => s.id === this.selectedSizeId);
        if (sizeObj) {
          variant.size_id = sizeObj.id;
          variant.size_name = sizeObj.name;
        }
      }
      if (!this.isSellingAttribute('COLOR') && this.enableColor && this.selectedColorId) {
        const colorObj = this.allColors.find(c => c.id === this.selectedColorId);
        if (colorObj) {
          variant.color_id = colorObj.id;
          variant.color_name = colorObj.name;
        }
      }
      if (!this.isSellingAttribute('ORIGIN') && this.enableOrigin && this.selectedOriginId) {
        const originObj = this.allOrigins.find(o => o.id === this.selectedOriginId);
        if (originObj) {
          variant.origin_id = originObj.id;
          variant.origin_name = originObj.name;
        }
      }

      this.variants.push(variant);
    });
  }

  // Cartesian product helper
  cartesianProduct(...arrays: any[][]): any[][] {
    return arrays.reduce((acc, arr) => {
      const result: any[][] = [];
      acc.forEach(a => {
        arr.forEach(b => {
          result.push([...a, b]);
        });
      });
      return result;
    }, [[]] as any[][]);
  }

  onFileChange(event: any) {
    const files = event.target.files;
    if (files.length > 5) {
      this.errors.images = 'Chỉ được chọn tối đa 5 ảnh';
      return;
    }
    this.errors.images = '';
    this.selectedFiles = Array.from(files);
    this.insertProductDTO.images = files;
  }

  validateForm(): boolean {
    this.errors = {};
    let isValid = true;

    // Validate tên sản phẩm
    if (!this.insertProductDTO.name || this.insertProductDTO.name.trim().length < 3) {
      this.errors.name = 'Tên sản phẩm phải có ít nhất 3 ký tự';
      isValid = false;
    }

    // Validate giá - bắt buộc phải nhập và > 0
    if (this.insertProductDTO.price === undefined || this.insertProductDTO.price === null || this.insertProductDTO.price <= 0) {
      this.errors.price = 'Giá sản phẩm phải lớn hơn 0';
      isValid = false;
    }

    // Validate danh mục
    if (!this.insertProductDTO.category_id || this.insertProductDTO.category_id === 0) {
      this.errors.category = 'Vui lòng chọn danh mục';
      isValid = false;
    }

    // Validate hình ảnh - bắt buộc phải có ít nhất 1 ảnh
    if (this.selectedFiles.length === 0) {
      this.errors.images = 'Vui lòng chọn ít nhất 1 hình ảnh cho sản phẩm';
      isValid = false;
    }

    // Validate thuộc tính bán
    if (this.hasSellingAttribute() && this.variants.length === 0) {
      this.errors.variants = 'Vui lòng chọn ít nhất 1 giá trị cho thuộc tính bán';
      isValid = false;
    }

    // Validate giá và tồn kho của từng biến thể
    if (this.variants.length > 0) {
      const hasInvalidVariant = this.variants.some(v =>
        v.price === undefined || v.price === null || v.price <= 0
      );
      if (hasInvalidVariant) {
        this.errors.variants = 'Tất cả biến thể phải có giá > 0';
        isValid = false;
      }
    }

    return isValid;
  }

  insertProduct() {
    if (!this.validateForm()) return;

    // Set selling_attributes
    this.insertProductDTO.selling_attributes = this.sellingAttribute;

    // Prepare variants
    this.insertProductDTO.variants = this.variants.map(v => ({
      color_id: v.color_id,
      size_id: v.size_id,
      origin_id: v.origin_id,
      price: v.price,
      stock_quantity: v.stock_quantity,
      image_url: v.image_url
    }));

    // If no selling attribute, create one default variant with display attributes
    if (!this.hasSellingAttribute()) {
      this.insertProductDTO.variants = [{
        price: this.insertProductDTO.price,
        stock_quantity: 0,
        size_id: this.enableSize ? this.selectedSizeId : undefined,
        color_id: this.enableColor ? this.selectedColorId : undefined,
        origin_id: this.enableOrigin ? this.selectedOriginId : undefined
      }];
    }

    this.loading = true;
    this.productService.insertProduct(this.insertProductDTO).subscribe({
      next: (apiResponse: ApiResponse) => {
        const productId = apiResponse.data.id;

        // Upload images if any selected
        if (this.selectedFiles.length > 0) {
          this.productService.uploadImages(productId, this.selectedFiles).subscribe({
            next: () => {
              this.loading = false;
              this.toastService.showToast({
                error: null,
                defaultMsg: 'Thêm sản phẩm và hình ảnh thành công!',
                title: 'Thành công'
              });
              this.router.navigate([`/admin/products/update/${productId}`]);
            },
            error: (error: HttpErrorResponse) => {
              this.loading = false;
              this.toastService.showToast({
                error: error,
                defaultMsg: 'Thêm sản phẩm thành công nhưng lỗi upload ảnh',
                title: 'Cảnh báo'
              });
              this.router.navigate([`/admin/products/update/${productId}`]);
            }
          });
        } else {
          this.loading = false;
          this.toastService.showToast({
            error: null,
            defaultMsg: 'Thêm sản phẩm thành công!',
            title: 'Thành công'
          });
          this.router.navigate([`/admin/products/update/${productId}`]);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Lỗi thêm sản phẩm',
          title: 'Lỗi'
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin/products']);
  }
}
