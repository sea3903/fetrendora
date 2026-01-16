/**
 * Auth Callback Component
 * -----------------------
 * Xử lý callback từ OAuth2 providers (Google, Facebook)
 * Được gọi khi người dùng xác thực thành công từ provider và redirect về app
 * 
 * Flow:
 * 1. Người dùng bấm "Đăng nhập bằng Facebook/Google"
 * 2. Redirect đến provider để xác thực
 * 3. Provider redirect về URL này kèm authorization code
 * 4. Component này gửi code đến backend để đổi lấy JWT token
 * 5. Lưu token và redirect người dùng về trang phù hợp
 */
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { BaseComponent } from '../base/base.component';
import { ApiResponse } from '../../responses/api.response';
import { tap, switchMap, take } from 'rxjs/operators';
import { UserResponse } from '../../responses/user/user.response';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-auth-callback',
  templateUrl: './auth-callback.component.html',
  styleUrls: ['./auth-callback.component.scss'],
  imports: [CommonModule]
})
export class AuthCallbackComponent extends BaseComponent implements OnInit {

  // PLATFORM_ID: Xác định đang chạy trên Browser hay Server (SSR)
  private platformId = inject(PLATFORM_ID);

  // Lưu trữ thông tin user sau khi đăng nhập thành công
  userResponse?: UserResponse;

  // Cờ flag ngăn chặn gọi API trùng lặp (duplicate calls)
  private isProcessing = false;

  ngOnInit() {
    // ═══════════════════════════════════════════════════════════════
    // BƯỚC 1: Kiểm tra môi trường - Chỉ chạy trên Browser
    // ═══════════════════════════════════════════════════════════════
    // Với Angular SSR, ngOnInit chạy 2 lần (server + client)
    // Chỉ cho phép chạy trên browser để tránh duplicate API calls
    if (!isPlatformBrowser(this.platformId)) {
      return; // Bỏ qua nếu đang chạy trên server
    }

    // ═══════════════════════════════════════════════════════════════
    // BƯỚC 2: Ngăn chặn xử lý trùng lặp
    // ═══════════════════════════════════════════════════════════════
    // Nếu đang xử lý rồi thì không xử lý lại
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true; // Đánh dấu đang xử lý

    // ═══════════════════════════════════════════════════════════════
    // BƯỚC 3: Xác định OAuth Provider (Google hoặc Facebook)
    // ═══════════════════════════════════════════════════════════════
    const url = this.router.url;
    let loginType: 'google' | 'facebook';

    if (url.includes('/auth/google/callback')) {
      loginType = 'google';
    } else if (url.includes('/auth/facebook/callback')) {
      loginType = 'facebook';
    } else {
      console.error('Không xác định được nhà cung cấp xác thực.');
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // BƯỚC 4: Lấy Authorization Code từ URL
    // ═══════════════════════════════════════════════════════════════
    // take(1): Chỉ lấy params 1 lần duy nhất, sau đó tự unsubscribe
    // Điều này ngăn chặn việc gọi API nhiều lần khi URL thay đổi
    this.activatedRoute.queryParams.pipe(take(1)).subscribe(params => {
      const code = params['code'];

      if (code) {
        // ═══════════════════════════════════════════════════════════
        // BƯỚC 5: Gửi code đến Backend để đổi lấy JWT Token
        // ═══════════════════════════════════════════════════════════
        // Backend sẽ:
        // - Gửi code đến Facebook/Google để lấy access_token
        // - Dùng access_token lấy thông tin user
        // - Tạo/cập nhật user trong DB
        // - Trả về JWT token của hệ thống
        this.authService.exchangeCodeForToken(code, loginType).pipe(
          // tap: Side effect - Lưu token vào localStorage
          tap((response: ApiResponse) => {
            const token = response.data.token;
            this.tokenService.setToken(token);
          }),
          // switchMap: Tiếp tục gọi API lấy chi tiết user
          switchMap((response) => {
            const token = response.data.token;
            return this.userService.getUserDetail(token);
          })
        ).subscribe({
          // ═══════════════════════════════════════════════════════════
          // BƯỚC 6: Xử lý đăng nhập thành công
          // ═══════════════════════════════════════════════════════════
          next: (apiResponse: ApiResponse) => {
            // Lưu thông tin user vào localStorage
            this.userResponse = {
              ...apiResponse.data,
              date_of_birth: new Date(apiResponse.data.date_of_birth),
            };
            this.userService.saveUserResponseToLocalStorage(this.userResponse);

            // Redirect dựa trên role của user
            if (this.userResponse?.role.name === 'admin') {
              this.router.navigate(['/admin']);
            } else if (this.userResponse?.role.name === 'user') {
              this.router.navigate(['/']);
            }
          },
          // ═══════════════════════════════════════════════════════════
          // BƯỚC 7: Xử lý lỗi
          // ═══════════════════════════════════════════════════════════
          error: (error: HttpErrorResponse) => {
            this.isProcessing = false; // Reset flag để có thể thử lại
            this.toastService.showToast({
              error: error,
              defaultMsg: 'Lỗi xác thực tài khoản',
              title: 'Lỗi Đăng Nhập'
            });
          },
          // ═══════════════════════════════════════════════════════════
          // BƯỚC 8: Hoàn tất - Refresh giỏ hàng
          // ═══════════════════════════════════════════════════════════
          complete: () => {
            this.cartService.refreshCart();
          }
        });
      } else {
        // Không có authorization code trong URL
        this.isProcessing = false;
        this.toastService.showToast({
          error: null,
          defaultMsg: 'Lỗi hệ thống xác thực',
          title: 'Lỗi Đăng Nhập'
        });
      }
    });
  }
}
