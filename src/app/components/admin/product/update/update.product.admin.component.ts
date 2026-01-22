import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Product } from '../../../../models/product';
import { Category } from '../../../../models/category';
import { Brand } from '../../../../models/brand';
import { ProductImage } from '../../../../models/product.image';
import { ProductDetail } from '../../../../models/product-detail';
import { ProductDetailDTO } from '../../../../dtos/product/product-detail.dto';
import { UpdateProductDTO } from '../../../../dtos/product/update.product.dto';
import { ApiResponse } from '../../../../responses/api.response';
import { environment } from '../../../../../environments/environment';
import { BaseComponent } from '../../../base/base.component';
import { BrandService } from '../../../../services/brand.service';
import { ProductDetailService } from '../../../../services/product-detail.service';
import { ColorService } from '../../../../services/color.service';
import { SizeService } from '../../../../services/size.service';
import { OriginService } from '../../../../services/origin.service';
import { Color } from '../../../../models/color';
import { Size } from '../../../../models/size';
import { Origin } from '../../../../models/origin';

@Component({
  selector: 'app-update-product-admin',
  templateUrl: './update.product.admin.component.html',
  styleUrls: ['./update.product.admin.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class UpdateProductAdminComponent extends BaseComponent implements OnInit {
  categories: Category[] = [];
  brands: Brand[] = [];
  colors: Color[] = [];
  sizes: Size[] = [];
  origins: Origin[] = [];

  productDetails: ProductDetail[] = [];
  currentImageIndex: number = 0;
  productId: number = 0;
  product: Product = {} as Product;
  updatedProduct: Product = {} as Product;
  loading: boolean = false;

  // Trạng thái Tab
  activeTab: 'info' | 'attributes' | 'images' = 'info';

  // Trạng thái Modal chi tiết biến thể
  showDetailModal: boolean = false;
  isEditingDetail: boolean = false;
  currentDetail: ProductDetailDTO = {
    product_id: 0,
    sku: '',
    price: 0,
    stock_quantity: 0,
    is_active: true
  };
  currentDetailId?: number;
  detailErrors: {
    sku?: string;
    price?: string;
    stock?: string;
  } = {};

  // Form errors for product info
  errors: {
    name?: string;
    price?: string;
    category?: string;
  } = {};

  // Cấu hình linh hoạt
  enableColor: boolean = false;
  enableSize: boolean = false;
  enableOrigin: boolean = false;
  uploadingImage: boolean = false;
  showCustomPrice: boolean = false;
  sellingAttribute: string = 'SIZE'; // SIZE, COLOR, ORIGIN, or COMBINED

  constructor(
    private productDetailService: ProductDetailService,
    private colorService: ColorService,
    private sizeService: SizeService,
    private originService: OriginService,
    private brandService: BrandService
  ) {
    super();
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe(params => {
      this.productId = Number(params.get('id'));
      if (this.productId) {
        this.getProductDetails();
        this.getProductVariants();
      }
    });
    this.loadCategories();
    this.loadBrands();
    this.loadColors();
    this.loadSizes();
    this.loadOrigins();
  }

  // --- Các hàm tải dữ liệu ---
  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (apiResponse: ApiResponse) => this.categories = apiResponse.data,
      error: (error: HttpErrorResponse) => console.error('Lỗi tải danh mục', error)
    });
  }

  loadBrands() {
    this.brandService.getAllBrands().subscribe({
      next: (apiResponse: ApiResponse) => this.brands = apiResponse.data,
      error: (error: HttpErrorResponse) => console.error('Lỗi tải thương hiệu', error)
    });
  }

  loadColors() {
    this.colorService.getAllColors().subscribe({
      next: (apiResponse: ApiResponse) => this.colors = apiResponse.data,
      error: (error: HttpErrorResponse) => console.error('Lỗi tải màu sắc', error)
    });
  }

  loadSizes() {
    this.sizeService.getAllSizes().subscribe({
      next: (apiResponse: ApiResponse) => this.sizes = apiResponse.data,
      error: (error: HttpErrorResponse) => console.error('Lỗi tải kích thước', error)
    });
  }

  loadOrigins() {
    this.originService.getAllOrigins().subscribe({
      next: (apiResponse: ApiResponse) => this.origins = apiResponse.data,
      error: (error: HttpErrorResponse) => console.error('Lỗi tải xuất xứ', error)
    });
  }

  getProductDetails(): void {
    this.productService.getDetailProduct(this.productId).subscribe({
      next: (apiResponse: ApiResponse) => {
        this.product = apiResponse.data;
        this.updatedProduct = { ...apiResponse.data };
        if (this.updatedProduct.product_images) {
          this.updatedProduct.product_images.forEach((img: ProductImage) => {
            if (!img.image_url.startsWith('http')) {
              img.image_url = `${environment.apiBaseUrl}/products/images/${img.image_url}`;
            }
          });
        }
        // Parse selling_attributes from product
        this.parseSellingAttributes(this.product.selling_attributes);
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({ error, defaultMsg: 'Lỗi tải chi tiết sản phẩm', title: 'Lỗi' });
      }
    });
  }

  // Parse selling_attributes string to checkboxes
  parseSellingAttributes(attrs?: string): void {
    if (!attrs) {
      // Fallback: detect from variants if no selling_attributes set
      return;
    }
    const attrArray = attrs.split(',').map(a => a.trim().toUpperCase());
    this.enableSize = attrArray.includes('SIZE');
    this.enableColor = attrArray.includes('COLOR');
    this.enableOrigin = attrArray.includes('ORIGIN');
  }

  // Build selling_attributes string from checkboxes
  buildSellingAttributes(): string {
    const attrs: string[] = [];
    if (this.enableSize) attrs.push('SIZE');
    if (this.enableColor) attrs.push('COLOR');
    if (this.enableOrigin) attrs.push('ORIGIN');
    return attrs.join(',');
  }

  getProductVariants(): void {
    this.productDetailService.getByProductId(this.productId).subscribe({
      next: (apiResponse: ApiResponse) => {
        this.productDetails = apiResponse.data;
        // Fix image URLs for display
        this.productDetails.forEach(detail => {
          if (detail.image_url && !detail.image_url.startsWith('http')) {
            // ...
          }
        });
        // Fallback: Tự động phát hiện nếu chưa có selling_attributes
        if (!this.product.selling_attributes) {
          this.detectVariantConfig();
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Lỗi tải biến thể', error);
      }
    });
  }

  detectVariantConfig() {
    this.enableSize = this.productDetails.some(d => d.size_id != null);
    this.enableOrigin = this.productDetails.some(d => d.origin_id != null);
  }

  // Check if any variant has specific attribute (for table column visibility)
  get hasSizeInVariants(): boolean {
    return this.productDetails.some(d => d.size_id != null);
  }

  get hasColorInVariants(): boolean {
    return this.productDetails.some(d => d.color_id != null);
  }

  get hasOriginInVariants(): boolean {
    return this.productDetails.some(d => d.origin_id != null);
  }

  // --- Logic UI ---
  switchTab(tab: 'info' | 'attributes' | 'images') {
    this.activeTab = tab;
  }


  thumbnailClick(index: number) {
    this.currentImageIndex = index;
  }

  // --- Logic Cập nhật Sản phẩm ---
  validateForm(): boolean {
    this.errors = {};
    let isValid = true;

    // Validate tên sản phẩm
    if (!this.updatedProduct.name || this.updatedProduct.name.trim().length < 3) {
      this.errors.name = 'Tên sản phẩm phải có ít nhất 3 ký tự';
      isValid = false;
    }

    // Validate giá - bắt buộc phải > 0
    if (this.updatedProduct.price === undefined || this.updatedProduct.price === null || this.updatedProduct.price <= 0) {
      this.errors.price = 'Giá sản phẩm phải lớn hơn 0';
      isValid = false;
    }

    // Validate danh mục
    if (!this.updatedProduct.category_id || this.updatedProduct.category_id === 0) {
      this.errors.category = 'Vui lòng chọn danh mục';
      isValid = false;
    }

    // Validate hình ảnh (Ít nhất 1 ảnh)
    if (!this.updatedProduct.product_images || this.updatedProduct.product_images.length === 0) {
      this.toastService.showToast({ error: null, defaultMsg: 'Sản phẩm phải có ít nhất 1 hình ảnh', title: 'Lỗi Validation' });
      isValid = false;
    }

    return isValid;
  }

  updateProduct() {
    if (!this.validateForm()) return;

    this.loading = true;
    const updateProductDTO: UpdateProductDTO = {
      name: this.updatedProduct.name,
      price: this.updatedProduct.price,
      description: this.updatedProduct.description,
      category_id: this.updatedProduct.category_id,
      brand_id: this.updatedProduct.brand_id,
      sku: this.updatedProduct.sku,
      slug: this.updatedProduct.slug,
      thumbnail: this.updatedProduct.thumbnail,
      selling_attributes: this.buildSellingAttributes(),
      is_active: this.updatedProduct.is_active
    };

    this.productService.updateProduct(this.product.id, updateProductDTO).subscribe({
      next: () => {
        this.loading = false;
        this.toastService.showToast({ error: null, defaultMsg: 'Cập nhật sản phẩm thành công', title: 'Thành công' });
        // Refresh data
        this.getProductDetails();
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.toastService.showToast({ error, defaultMsg: 'Lỗi cập nhật sản phẩm', title: 'Lỗi' });
      }
    });
  }

  // --- Logic Modal Biến thể ---
  openDetailModal(detail?: ProductDetail) {
    this.detailErrors = {};
    if (detail) {
      this.isEditingDetail = true;
      this.currentDetailId = detail.id;
      this.currentDetail = {
        product_id: this.productId,
        sku: detail.sku,
        price: detail.price,
        stock_quantity: detail.stock_quantity,
        is_active: detail.is_active,
        color_id: detail.color_id,
        size_id: detail.size_id,
        origin_id: detail.origin_id,
        image_url: detail.image_url
      };
    } else {
      this.isEditingDetail = false;
      this.currentDetailId = undefined;

      // Tự động tạo SKU dựa trên cấu hình (sẽ cập nhật lại khi người dùng chọn thuộc tính)
      const baseSku = this.product.sku || 'PROD';
      this.currentDetail = {
        product_id: this.productId,
        sku: `${baseSku}-NEW`,
        price: this.product.price || 0, // Kế thừa giá từ sản phẩm cha
        stock_quantity: 0,
        is_active: true
      };
      this.showCustomPrice = false;
    }
    // Nếu đang edit, check xem giá có khác giá gốc không để bật toggle
    if (this.isEditingDetail) {
      this.showCustomPrice = this.currentDetail.price !== this.product.price;
    }
    this.showDetailModal = true;
  }

  // Hàm update SKU tự động khi chọn thuộc tính
  updateAutoSku() {
    if (this.isEditingDetail) return; // Không tự sửa khi đang edit

    let suffix = '';
    if (this.enableColor && this.currentDetail.color_id) {
      const c = this.colors.find(x => x.id == this.currentDetail.color_id);
      if (c) suffix += `-${c.name.toUpperCase()}`;
    }
    if (this.enableSize && this.currentDetail.size_id) {
      const s = this.sizes.find(x => x.id == this.currentDetail.size_id);
      if (s) suffix += `-${s.name.toUpperCase()}`;
    }
    if (this.enableOrigin && this.currentDetail.origin_id) {
      const o = this.origins.find(x => x.id == this.currentDetail.origin_id);
      if (o) suffix += `-${o.name.toUpperCase()}`;
    }

    const baseSku = this.product.sku || 'PROD';
    // Nếu chưa chọn gì thì random, nếu chọn rồi thì ghép chuỗi
    if (suffix) {
      this.currentDetail.sku = `${baseSku}${suffix}`; // Loại bỏ dấu cách nếu cần
    } else {
      this.currentDetail.sku = `${baseSku}-NEW`;
    }
  }

  closeDetailModal() {
    this.showDetailModal = false;
  }

  validateDetail(): boolean {
    this.detailErrors = {};
    let isValid = true;
    if (!this.currentDetail.sku) { this.detailErrors.sku = 'Mã SKU không được để trống'; isValid = false; }
    if (this.currentDetail.price < 0) { this.detailErrors.price = 'Giá không hợp lệ'; isValid = false; }
    if (this.currentDetail.stock_quantity < 0) { this.detailErrors.stock = 'Số lượng không hợp lệ'; isValid = false; }

    // Validate theo cấu hình
    if (this.enableColor && !this.currentDetail.color_id) {
      // Thêm error cho color (cần định nghĩa thêm trong detailErrors hoặc dùng chung)
      // Hack tạm: alert hoặc show error chung
    }
    // Logic validate chi tiết hơn sẽ được handle ở HTML bằng disabled/required
    return isValid;
  }

  saveDetail() {
    if (!this.validateDetail()) return;

    if (this.isEditingDetail && this.currentDetailId) {
      this.productDetailService.update(this.currentDetailId, this.currentDetail).subscribe({
        next: () => {
          this.toastService.showToast({ error: null, defaultMsg: 'Cập nhật biến thể thành công', title: 'Thành công' });
          this.closeDetailModal();
          this.getProductVariants();
        },
        error: (err: HttpErrorResponse) => this.toastService.showToast({ error: err, defaultMsg: 'Lỗi cập nhật biến thể', title: 'Lỗi' })
      });
    } else {
      this.productDetailService.create(this.currentDetail).subscribe({
        next: () => {
          this.toastService.showToast({ error: null, defaultMsg: 'Thêm biến thể thành công', title: 'Thành công' });
          this.closeDetailModal();
          this.getProductVariants();
        },
        error: (err: HttpErrorResponse) => this.toastService.showToast({ error: err, defaultMsg: 'Lỗi thêm biến thể', title: 'Lỗi' })
      });
    }
  }

  deleteDetail(id: number) {
    if (confirm('Bạn có chắc chắn muốn xóa biến thể này?')) {
      this.productDetailService.delete(id).subscribe({
        next: () => {
          this.toastService.showToast({ error: null, defaultMsg: 'Xóa biến thể thành công', title: 'Thành công' });
          this.getProductVariants();
        },
        error: (err: HttpErrorResponse) => this.toastService.showToast({ error: err, defaultMsg: 'Lỗi xóa biến thể', title: 'Lỗi' })
      });
    }
  }

  // --- Xử lý Hình ảnh Biến thể ---
  onVariantImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate kích thước file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.toastService.showToast({ error: null, defaultMsg: 'File quá lớn. Tối đa 10MB', title: 'Lỗi' });
      return;
    }

    // Validate loại file
    if (!file.type.startsWith('image/')) {
      this.toastService.showToast({ error: null, defaultMsg: 'File phải là hình ảnh', title: 'Lỗi' });
      return;
    }

    this.uploadingImage = true;

    // Sử dụng API upload riêng cho variant
    this.productDetailService.uploadVariantImage(file).subscribe({
      next: (response: ApiResponse) => {
        this.uploadingImage = false;
        // Response.data chứa filename
        if (response.data) {
          this.currentDetail.image_url = response.data;
          this.toastService.showToast({ error: null, defaultMsg: 'Upload ảnh thành công', title: 'Thành công' });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.uploadingImage = false;
        this.toastService.showToast({ error: err, defaultMsg: 'Lỗi upload ảnh', title: 'Lỗi' });
      }
    });
  }

  // Helper để lấy Full Image URL cho hiển thị
  getVariantImageUrl(imageUrl?: string): string {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${environment.apiBaseUrl}/products/images/${imageUrl}`;
  }

  // --- Xử lý Hình ảnh Chung ---
  onFileChange(event: any) {
    const files = event.target.files;
    if (files.length > 5) {
      this.toastService.showToast({ error: null, defaultMsg: 'Chỉ được chọn tối đa 5 ảnh', title: 'Cảnh báo' });
      return;
    }
    this.productService.uploadImages(this.productId, files).subscribe({
      next: () => {
        this.toastService.showToast({ error: null, defaultMsg: 'Upload ảnh thành công', title: 'Thành công' });
        this.getProductDetails();
      },
      error: (error: HttpErrorResponse) => this.toastService.showToast({ error, defaultMsg: 'Lỗi upload ảnh', title: 'Lỗi' })
    });
  }

  deleteImage(productImage: ProductImage) {
    if (confirm('Bạn có chắc chắn muốn xóa ảnh này?')) {
      this.productService.deleteProductImage(productImage.id).subscribe({
        next: () => {
          this.toastService.showToast({ error: null, defaultMsg: 'Xóa ảnh thành công', title: 'Thành công' });
          this.getProductDetails();
        },
        error: (error: HttpErrorResponse) => this.toastService.showToast({ error, defaultMsg: 'Lỗi xóa ảnh', title: 'Lỗi' })
      });
    }
  }

  goBack() {
    this.router.navigate(['/admin/products']);
  }

  trackByProductDetail(index: number, item: ProductDetail): number {
    return item.id;
  }

  // Save attribute configuration
  saveAttributeConfig() {
    const updateProductDTO: UpdateProductDTO = {
      name: this.updatedProduct.name,
      price: this.updatedProduct.price,
      description: this.updatedProduct.description,
      category_id: this.updatedProduct.category_id,
      brand_id: this.updatedProduct.brand_id,
      sku: this.updatedProduct.sku,
      slug: this.updatedProduct.slug,
      thumbnail: this.updatedProduct.thumbnail,
      selling_attributes: this.buildSellingAttributes(),
      is_active: this.updatedProduct.is_active
    };

    this.productService.updateProduct(this.product.id, updateProductDTO).subscribe({
      next: () => {
        this.toastService.showToast({ error: null, defaultMsg: 'Lưu cấu hình thuộc tính thành công', title: 'Thành công' });
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({ error, defaultMsg: 'Lỗi lưu cấu hình', title: 'Lỗi' });
      }
    });
  }
}

