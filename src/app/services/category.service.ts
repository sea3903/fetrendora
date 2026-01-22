import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../responses/api.response';

export interface CategoryDTO {
  name: string;
  parentId?: number | null;
  slug?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = `${environment.apiBaseUrl}/categories`;

  constructor(private http: HttpClient) { }

  // Lấy tất cả danh mục (flat list)
  getCategories(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(this.apiUrl);
  }

  // Lấy danh mục dạng cây
  getCategoryTree(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/tree`);
  }

  // Lấy danh mục gốc
  getRootCategories(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/roots`);
  }

  // Lấy danh mục con
  getChildCategories(parentId: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/children/${parentId}`);
  }

  // Tìm kiếm danh mục
  searchCategories(keyword: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/search`, {
      params: { keyword }
    });
  }

  // Lấy chi tiết danh mục
  getCategoryById(id: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  // Thêm danh mục
  createCategory(dto: CategoryDTO): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.apiUrl, dto);
  }

  // Cập nhật danh mục
  updateCategory(id: number, dto: CategoryDTO): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, dto);
  }

  // Xóa danh mục
  deleteCategory(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }
}
