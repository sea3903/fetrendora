import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { TokenService } from '../../../services/token.service';
import { UserResponse } from '../../../responses/user/user.response';
import { UpdateUserDTO } from '../../../dtos/user/update.user.dto';
import { ToastService } from '../../../services/toast.service';

import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
    selector: 'app-admin-change-password',
    templateUrl: './admin-change-password.component.html',
    styleUrls: ['./admin-change-password.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink
    ]
})
export class AdminChangePasswordComponent implements OnInit {
    userResponse?: UserResponse;

    // Form fields
    currentPassword: string = '';
    newPassword: string = '';
    confirmPassword: string = '';

    // State
    changingPassword: boolean = false;
    loading: boolean = true;

    // Validation errors
    currentPwdError: string = '';
    newPwdError: string = '';
    confirmPwdError: string = '';

    private userService = inject(UserService);
    private tokenService = inject(TokenService);
    private toastService = inject(ToastService);

    private router = inject(Router);

    ngOnInit() {
        const token = this.tokenService.getToken();
        if (!token) {
            this.router.navigate(['/login']);
            return;
        }

        const savedUser = this.userService.getUserResponseFromLocalStorage();
        if (savedUser && savedUser.id) {
            this.userResponse = savedUser;
            this.loading = false;
        } else {
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
                    this.userService.saveUserResponseToLocalStorage(response.data);
                }
            },
            error: (err: HttpErrorResponse) => {
                this.loading = false;
                if (err.status === 401 || err.status === 403) {
                    this.tokenService.removeToken();
                    this.router.navigate(['/login']);
                }
            }
        });
    }

    // Validation
    validateCurrentPassword(): boolean {
        if (!this.currentPassword || this.currentPassword.trim() === '') {
            this.currentPwdError = 'Vui lòng nhập mật khẩu hiện tại';
            return false;
        }
        this.currentPwdError = '';
        return true;
    }

    validateNewPassword(): boolean {
        if (!this.newPassword || this.newPassword.trim() === '') {
            this.newPwdError = 'Vui lòng nhập mật khẩu mới';
            return false;
        }
        if (this.newPassword.length < 6) {
            this.newPwdError = 'Mật khẩu phải có ít nhất 6 ký tự';
            return false;
        }
        this.newPwdError = '';
        if (this.confirmPassword) {
            this.validateConfirmPassword();
        }
        return true;
    }

    validateConfirmPassword(): boolean {
        if (!this.confirmPassword || this.confirmPassword.trim() === '') {
            this.confirmPwdError = 'Vui lòng xác nhận mật khẩu mới';
            return false;
        }
        if (this.newPassword !== this.confirmPassword) {
            this.confirmPwdError = 'Mật khẩu xác nhận không khớp';
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

    // Change Password
    changePassword() {
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
                    title: 'Thành công',
                    defaultMsg: 'Đổi mật khẩu thành công!'
                });

                // Reset form
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
                    msg = 'Mật khẩu hiện tại không đúng';
                }
                this.toastService.showToast({
                    title: 'Lỗi',
                    defaultMsg: msg,
                    error: err
                });
            }
        });
    }
}
