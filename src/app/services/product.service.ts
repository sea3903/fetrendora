import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product } from '../models/product';
import { UpdateProductDTO } from '../dtos/product/update.product.dto';
import { InsertProductDTO } from '../dtos/product/insert.product.dto';
import { ApiResponse } from '../responses/api.response';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  getProducts(
    keyword: string,
    categoryId: number,
    page: number,
    limit: number,
    active?: boolean
  ): Observable<ApiResponse> {
    const params: any = {
      keyword: keyword,
      category_id: categoryId.toString(),
      page: page.toString(),
      limit: limit.toString()
    };
    if (active != null) {
      params.active = active.toString();
    }
    return this.http.get<ApiResponse>(`${this.apiBaseUrl}/products`, { params });
  }

  getDetailProduct(productId: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiBaseUrl}/products/${productId}`);
  }

  getProductsByIds(productIds: number[]): Observable<ApiResponse> {
    const params = new HttpParams().set('ids', productIds.join(','));
    return this.http.get<ApiResponse>(`${this.apiBaseUrl}/products/by-ids`, { params });
  }
  deleteProduct(productId: number): Observable<ApiResponse> {
    debugger
    return this.http.delete<ApiResponse>(`${this.apiBaseUrl}/products/${productId}`);
  }
  updateProduct(productId: number, updatedProduct: UpdateProductDTO): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiBaseUrl}/products/${productId}`, updatedProduct);
  }
  insertProduct(insertProductDTO: InsertProductDTO): Observable<ApiResponse> {
    // Thêm một sản phẩm mới
    return this.http.post<ApiResponse>(`${this.apiBaseUrl}/products`, insertProductDTO);
  }
  uploadImages(productId: number, files: File[]): Observable<ApiResponse> {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    // Tải lên hình ảnh cho productId tương ứng
    return this.http.post<ApiResponse>(`${this.apiBaseUrl}/products/uploads/${productId}`, formData);
  }
  deleteProductImage(id: number): Observable<any> {
    return this.http.delete<string>(`${this.apiBaseUrl}/product_images/${id}`);
  }

  // Yêu thích sản phẩm
  likeProduct(productId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiBaseUrl}/products/like/${productId}`, {});
  }

  // Bỏ yêu thích sản phẩm
  unlikeProduct(productId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiBaseUrl}/products/unlike/${productId}`, {});
  }

  // Lấy danh sách sản phẩm yêu thích của user hiện tại
  getFavoriteProducts(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiBaseUrl}/products/favorite-products`, {});
  }
}