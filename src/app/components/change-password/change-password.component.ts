import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { UserService } from '../../services/user.service';
import { TokenService } from '../../services/token.service';
import { UserResponse } from '../../responses/user/user.response';
import { UpdateUserDTO } from '../../dtos/user/update.user.dto';
import { ToastService } from '../../services/toast.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
    selector: 'app-change-password',
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        HeaderComponent,
        FooterComponent,
        TranslateModule
    ]
})
export class ChangePasswordComponent implements OnInit {
    userResponse?: UserResponse;

    // Các trường form
    currentPassword: string = '';
    newPassword: string = '';
    confirmPassword: string = '';

    // Trạng thái
    changingPassword: boolean = false;
    loading: boolean = true;

    // Lỗi validation inline
    currentPwdError: string = '';
    newPwdError: string = '';
    confirmPwdError: string = '';

    @ViewChild('passwordForm') passwordForm!: NgForm;

    private userService = inject(UserService);
    private tokenService = inject(TokenService);
    private toastService = inject(ToastService);
    private translate = inject(TranslateService);
    private router = inject(Router);

    ngOnInit() {
        // Kiểm tra token trước
        const token = this.tokenService.getToken();
        if (!token) {
            this.router.navigate(['/login']);
            return;
        }

        // Thử lấy user từ localStorage trước để tránh API call không cần thiết
        const savedUser = this.userService.getUserResponseFromLocalStorage();
        if (savedUser && savedUser.id) {
            this.userResponse = savedUser;
            this.loading = false;
        } else {
            // Nếu không có trong localStorage, lấy từ server
            this.getUserDetails();
        }
    }

    getUserDetails() {
        const token = this.tokenService.getToken();
        if (!token) {
            this.router.navigate(['/login']);
            return;
        }

        this.loading = true;
        this.userService.getUserDetail(token).subscribe({
            next: (response: any) => {
                this.loading = false;
                if (response.data) {
                    this.userResponse = response.data;
                    // Lưu lại vào localStorage để các page khác có thể dùng
                    this.userService.saveUserResponseToLocalStorage(response.data);
                }
            },
            error: (err: HttpErrorResponse) => {
                this.loading = false;
                console.error('Không thể tải thông tin:', err);
                // Chỉ redirect nếu token hết hạn (401/403)
                if (err.status === 401 || err.status === 403) {
                    this.tokenService.removeToken();
                    this.router.navigate(['/login']);
                }
            }
        });
    }

    // ════════════════════════════════════════════════════════════════
    // VALIDATION - Kiểm tra realtime khi người dùng nhập
    // ════════════════════════════════════════════════════════════════

    validateCurrentPassword(): boolean {
        if (!this.currentPassword || this.currentPassword.trim() === '') {
            this.currentPwdError = this.translate.instant('PROFILE.VALIDATION.CURRENT_PASSWORD_REQUIRED');
            return false;
        }
        this.currentPwdError = '';
        return true;
    }

    validateNewPassword(): boolean {
        if (!this.newPassword || this.newPassword.trim() === '') {
            this.newPwdError = this.translate.instant('PROFILE.VALIDATION.NEW_PASSWORD_REQUIRED');
            return false;
        }
        if (this.newPassword.length < 6) {
            this.newPwdError = this.translate.instant('PROFILE.VALIDATION.PASSWORD_MIN');
            return false;
        }
        this.newPwdError = '';
        // Sau khi validate newPassword, cũng check confirmPassword
        if (this.confirmPassword) {
            this.validateConfirmPassword();
        }
        return true;
    }

    validateConfirmPassword(): boolean {
        if (!this.confirmPassword || this.confirmPassword.trim() === '') {
            this.confirmPwdError = this.translate.instant('PROFILE.VALIDATION.CONFIRM_PASSWORD_REQUIRED');
            return false;
        }
        if (this.newPassword !== this.confirmPassword) {
            this.confirmPwdError = this.translate.instant('PROFILE.VALIDATION.PASSWORD_MISMATCH');
            return false;
        }
        this.confirmPwdError = '';
        return true;
    }

    isFormValid(): boolean {
        return this.currentPwdError === '' &&
            this.newPwdError === '' &&
            this.confirmPwdError === '' &&
            this.currentPassword.trim() !== '' &&
            this.newPassword.length >= 6 &&
            this.newPassword === this.confirmPassword;
    }

    // ════════════════════════════════════════════════════════════════
    // ĐỔI MẬT KHẨU
    // ════════════════════════════════════════════════════════════════

    changePassword() {
        // Validate tất cả
        const isCurrentValid = this.validateCurrentPassword();
        const isNewValid = this.validateNewPassword();
        const isConfirmValid = this.validateConfirmPassword();

        if (!isCurrentValid || !isNewValid || !isConfirmValid) {
            return;
        }

        if (!this.userResponse) return;
        this.changingPassword = true;

        const token = this.tokenService.getToken();
        if (!token) return;

        const updateDTO: UpdateUserDTO = {
            current_password: this.currentPassword,
            password: this.newPassword,
            retype_password: this.confirmPassword
        };

        this.userService.updateUserDetail(token, updateDTO).subscribe({
            next: () => {
                this.changingPassword = false;
                this.toastService.showToast({
                    title: this.translate.instant('COMMON.SUCCESS'),
                    defaultMsg: this.translate.instant('PROFILE.PASSWORD_CHANGE_SUCCESS')
                });

                // Reset form - không gọi resetForm() để tránh focus issue
                this.currentPassword = '';
                this.newPassword = '';
                this.confirmPassword = '';
                this.currentPwdError = '';
                this.newPwdError = '';
                this.confirmPwdError = '';
            },
            error: (err: HttpErrorResponse) => {
                this.changingPassword = false;
                let msg = err.error?.message || 'Đổi mật khẩu thất bại';
                if (msg.includes('incorrect') || msg.includes('sai') || msg.includes('wrong')) {
                    msg = this.translate.instant('PROFILE.VALIDATION.CURRENT_PASSWORD_INCORRECT');
                }
                this.toastService.showToast({
                    title: this.translate.instant('COMMON.ERROR'),
                    defaultMsg: msg,
                    error: err
                });
            }
        });
    }
}
