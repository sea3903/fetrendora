import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { RegisterDTO } from '../dtos/user/register.dto';
import { LoginDTO } from '../dtos/user/login.dto';
import { environment } from '../../environments/environment';
import { HttpUtilService } from './http.util.service';
import { UserResponse } from '../responses/user/user.response';
import { UpdateUserDTO } from '../dtos/user/update.user.dto';
import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { ApiResponse } from '../responses/api.response';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiRegister = `${environment.apiBaseUrl}/users/register`;
  private apiLogin = `${environment.apiBaseUrl}/users/login`;
  private apiUserDetail = `${environment.apiBaseUrl}/users/details`;

  private http = inject(HttpClient);
  private httpUtilService = inject(HttpUtilService);
  private jwtHelper = new JwtHelperService();

  localStorage?: Storage;

  private apiConfig = {
    headers: this.httpUtilService.createHeaders(),
  }

  // ════════════════════════════════════════════════════════════════
  // BEHAVIOR SUBJECT - REAL-TIME USER UPDATES
  // ════════════════════════════════════════════════════════════════
  private userSubject = new BehaviorSubject<UserResponse | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(
    @Inject(DOCUMENT) private document: Document
  ) {
    this.localStorage = document.defaultView?.localStorage;
    console.log('UserService: localStorage available:', !!this.localStorage);

    // Khởi tạo user từ localStorage khi service được tạo
    const savedUser = this.getUserResponseFromLocalStorage();
    console.log('UserService: Saved user from localStorage:', savedUser);

    if (savedUser) {
      this.userSubject.next(savedUser);
    }
  }

  // Emit user change event
  emitUserChange(user: UserResponse | null) {
    this.userSubject.next(user);
  }

  register(registerDTO: RegisterDTO): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.apiRegister, registerDTO, this.apiConfig);
  }

  login(loginDTO: LoginDTO): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.apiLogin, loginDTO, this.apiConfig);
  }

  getUserDetail(token: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.apiUserDetail, null, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      })
    });
  }

  // ════════════════════════════════════════════════════════════════
  // LẤY USER ID TỪ JWT TOKEN - NGUỒN TIN CẬY NHẤT
  // ════════════════════════════════════════════════════════════════
  private getUserIdFromToken(token: string): number | null {
    try {
      if (!token) return null;
      const decoded = this.jwtHelper.decodeToken(token);
      if (decoded && 'userId' in decoded) {
        return parseInt(decoded['userId']);
      }
      return null;
    } catch (error) {
      console.error('Không thể decode token:', error);
      return null;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // UPDATE USER - SỬ DỤNG USER ID TỪ TOKEN
  // ════════════════════════════════════════════════════════════════
  updateUserDetail(token: string, updateUserDTO: UpdateUserDTO): Observable<ApiResponse> {
    // Lấy userId từ JWT token - đáng tin cậy hơn localStorage
    const userId = this.getUserIdFromToken(token);

    if (!userId) {
      // Fallback: thử lấy từ localStorage
      const userFromStorage = this.getUserResponseFromLocalStorage();
      if (userFromStorage?.id) {
        console.log('Dùng userId từ localStorage:', userFromStorage.id);
        return this.http.put<ApiResponse>(`${this.apiUserDetail}/${userFromStorage.id}`, updateUserDTO, {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          })
        });
      }

      console.error('Không tìm thấy userId từ cả token và localStorage');
      return new Observable(observer => {
        observer.error({ status: 400, error: { message: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' } });
      });
    }

    console.log('Dùng userId từ JWT token:', userId);
    return this.http.put<ApiResponse>(`${this.apiUserDetail}/${userId}`, updateUserDTO, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      })
    });
  }

  // ════════════════════════════════════════════════════════════════
  // LOCAL STORAGE OPERATIONS - WITH REAL-TIME EMIT
  // ════════════════════════════════════════════════════════════════
  saveUserResponseToLocalStorage(userResponse?: UserResponse) {
    try {
      if (!userResponse) {
        console.warn('Không có user data để lưu');
        return;
      }
      if (!userResponse.id) {
        console.error('User không có ID, không lưu vào localStorage');
        return;
      }
      const userResponseJSON = JSON.stringify(userResponse);
      this.localStorage?.setItem('user', userResponseJSON);
      console.log('User saved to localStorage, ID:', userResponse.id);

      // EMIT USER CHANGE cho real-time update
      this.emitUserChange(userResponse);
    } catch (error) {
      console.error('Error saving user to localStorage:', error);
    }
  }

  getUserResponseFromLocalStorage(): UserResponse | null {
    try {
      const userResponseJSON = this.localStorage?.getItem('user');
      if (!userResponseJSON) {
        return null;
      }
      const userResponse = JSON.parse(userResponseJSON);
      return userResponse;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  }

  removeUserFromLocalStorage(): void {
    try {
      this.localStorage?.removeItem('user');
      console.log('User data removed from localStorage.');
      // EMIT NULL khi logout
      this.emitUserChange(null);
    } catch (error) {
      console.error('Error removing user from localStorage:', error);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // OTHER METHODS
  // ════════════════════════════════════════════════════════════════
  getUsers(params: { page: number, limit: number, keyword: string }): Observable<ApiResponse> {
    const url = `${environment.apiBaseUrl}/users`;
    return this.http.get<ApiResponse>(url, { params: params });
  }

  resetPassword(userId: number): Observable<ApiResponse> {
    const url = `${environment.apiBaseUrl}/users/reset-password/${userId}`;
    return this.http.put<ApiResponse>(url, null, this.apiConfig);
  }

  toggleUserStatus(params: { userId: number, enable: boolean }): Observable<ApiResponse> {
    const url = `${environment.apiBaseUrl}/users/block/${params.userId}/${params.enable ? '1' : '0'}`;
    return this.http.put<ApiResponse>(url, null, this.apiConfig);
  }

  getBlockedUsers(params: { page: number, limit: number, keyword: string }): Observable<ApiResponse> {
    const url = `${environment.apiBaseUrl}/users/blocked`;
    return this.http.get<ApiResponse>(url, { params: params });
  }

  changeRole(userId: number, roleId: number): Observable<ApiResponse> {
    const url = `${environment.apiBaseUrl}/users/change-role/${userId}/${roleId}`;
    return this.http.put<ApiResponse>(url, null, this.apiConfig);
  }

  getRoles(): Observable<ApiResponse> {
    const url = `${environment.apiBaseUrl}/roles`;
    return this.http.get<ApiResponse>(url);
  }

  adminUpdateUser(userId: number, data: any): Observable<ApiResponse> {
    const url = `${environment.apiBaseUrl}/users/admin/update/${userId}`;
    return this.http.put<ApiResponse>(url, data, this.apiConfig);
  }

  forgotPassword(email: string): Observable<ApiResponse> {
    const url = `${environment.apiBaseUrl}/users/forgot-password`;
    return this.http.post<ApiResponse>(`${url}?email=${email}`, null);
  }

  resetPasswordWithToken(token: string, newPassword: string): Observable<ApiResponse> {
    const url = `${environment.apiBaseUrl}/users/reset-password-token`;
    return this.http.post<ApiResponse>(`${url}?token=${token}&newPassword=${newPassword}`, null);
  }

  uploadProfileImage(token: string, file: File): Observable<ApiResponse> {
    const url = `${environment.apiBaseUrl}/users/upload-profile-image`;
    const formData = new FormData();
    formData.append('file', file);
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.post<ApiResponse>(url, formData, { headers });
  }
}
