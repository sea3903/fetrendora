import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-user-profile',
    templateUrl: './user-profile.component.html',
    styleUrls: ['./user-profile.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        HeaderComponent,
        FooterComponent,
        TranslateModule
    ],
    providers: [DatePipe]
})
export class UserProfileComponent implements OnInit {
    userResponse?: UserResponse;

    // Các trường form - Chỉ thông tin cá nhân
    fullName: string = '';
    email: string = '';
    phoneNumber: string = '';
    address: string = '';
    dateOfBirth: string = '';

    // Avatar
    avatarUrl: string = 'assets/images/user-placeholder.png';
    selectedFile: File | null = null;

    // Trạng thái loading
    saving: boolean = false;
    loading: boolean = true;

    // Lỗi validation - hiện inline
    fullNameError: string = '';
    phoneError: string = '';

    private userService = inject(UserService);
    private tokenService = inject(TokenService);
    private toastService = inject(ToastService);
    private translate = inject(TranslateService);
    private datePipe = inject(DatePipe);
    private router = inject(Router);

    ngOnInit() {
        // Kiểm tra token
        const token = this.tokenService.getToken();
        if (!token) {
            this.router.navigate(['/login']);
            return;
        }

        // Thử load từ localStorage trước (nhanh hơn, không cần API call)
        const savedUser = this.userService.getUserResponseFromLocalStorage();
        if (savedUser && savedUser.id) {
            this.userResponse = savedUser;
            this.populateForm();
            this.loading = false;
        } else {
            // Chỉ gọi API nếu không có trong localStorage
            this.getUserDetailsFromServer();
        }
    }

    // Lấy thông tin user từ server
    private getUserDetailsFromServer() {
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
                    this.populateForm();
                }
            },
            error: (err: HttpErrorResponse) => {
                this.loading = false;
                console.error('Không thể tải thông tin:', err);
                // Chỉ redirect nếu token hết hạn (401/403)
                if (err.status === 401 || err.status === 403) {
                    this.tokenService.removeToken();
                    this.userService.removeUserFromLocalStorage();
                    this.router.navigate(['/login']);
                }
            }
        });
    }

    // Điền dữ liệu vào form
    private populateForm() {
        if (!this.userResponse) return;

        this.fullName = this.userResponse.fullname || '';
        this.email = this.userResponse.email || '';
        this.phoneNumber = this.userResponse.phone_number || '';
        this.address = this.userResponse.address || '';

        if (this.userResponse.date_of_birth) {
            try {
                const dob = new Date(this.userResponse.date_of_birth);
                this.dateOfBirth = this.datePipe.transform(dob, 'yyyy-MM-dd') || '';
            } catch (e) { console.error(e); }
        }

        // Lấy avatar từ server nếu có
        if (this.userResponse.profile_image && this.userResponse.profile_image.trim() !== '') {
            // Nếu là URL đầy đủ từ social login (Google/Facebook)
            if (this.userResponse.profile_image.startsWith('http')) {
                this.avatarUrl = this.userResponse.profile_image;
            } else {
                // Nếu là file local trên server
                this.avatarUrl = `${environment.apiBaseUrl}/users/profile-images/${this.userResponse.profile_image}`;
            }
        }
    }

    // ════════════════════════════════════════════════════════════════
    // VALIDATION - Kiểm tra realtime khi người dùng nhập
    // ════════════════════════════════════════════════════════════════

    validateFullName(): boolean {
        if (!this.fullName || this.fullName.trim() === '') {
            this.fullNameError = this.translate.instant('PROFILE.VALIDATION.FULLNAME_REQUIRED');
            return false;
        }
        const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂẵếưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;
        if (!nameRegex.test(this.fullName.trim())) {
            this.fullNameError = this.translate.instant('PROFILE.VALIDATION.FULLNAME_INVALID');
            return false;
        }
        this.fullNameError = '';
        return true;
    }

    validatePhone(): boolean {
        if (!this.phoneNumber || this.phoneNumber.trim() === '') {
            this.phoneError = '';
            return true;
        }
        const phone = this.phoneNumber.trim();
        const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            this.phoneError = this.translate.instant('PROFILE.VALIDATION.PHONE_INVALID');
            return false;
        }
        this.phoneError = '';
        return true;
    }

    isFormValid(): boolean {
        return this.fullNameError === '' && this.phoneError === '' && this.fullName.trim() !== '';
    }

    // ════════════════════════════════════════════════════════════════
    // XỬ LÝ AVATAR
    // ════════════════════════════════════════════════════════════════

    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.avatarUrl = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    onImageError(event: any) {
        event.target.src = 'assets/images/user-placeholder.png';
    }

    // ════════════════════════════════════════════════════════════════
    // LƯU THÔNG TIN
    // ════════════════════════════════════════════════════════════════
    saveProfile() {
        const isNameValid = this.validateFullName();
        const isPhoneValid = this.validatePhone();

        if (!isNameValid || !isPhoneValid) {
            return;
        }

        if (!this.userResponse) return;
        this.saving = true;

        const token = this.tokenService.getToken();
        if (!token) {
            this.saving = false;
            return;
        }

        if (this.selectedFile) {
            this.userService.uploadProfileImage(token, this.selectedFile).subscribe({
                next: () => this.updateProfileInfo(token),
                error: (err: HttpErrorResponse) => {
                    this.saving = false;
                    this.toastService.showToast({
                        title: this.translate.instant('COMMON.ERROR'),
                        defaultMsg: err.error?.message || 'Upload avatar thất bại',
                        error: err
                    });
                }
            });
        } else {
            this.updateProfileInfo(token);
        }
    }

    private updateProfileInfo(token: string) {
        let dobDate: Date | undefined = undefined;
        if (this.dateOfBirth) {
            dobDate = new Date(this.dateOfBirth);
        }

        const updateUserDTO: UpdateUserDTO = {
            fullname: this.fullName.trim(),
            phone_number: this.phoneNumber.trim(),
            address: this.address,
            date_of_birth: dobDate
        };

        this.userService.updateUserDetail(token, updateUserDTO).subscribe({
            next: (response: any) => {
                this.saving = false;

                if (response.data) {
                    // Lấy user hiện tại từ localStorage
                    const currentUser = this.userService.getUserResponseFromLocalStorage();

                    // Merge: ưu tiên giữ ID từ currentUser nếu response không có
                    const updatedUser: UserResponse = {
                        ...currentUser,
                        ...response.data,
                        // Đảm bảo ID luôn tồn tại
                        id: response.data.id || currentUser?.id || this.userResponse?.id
                    } as UserResponse;

                    console.log('Saving user to localStorage:', updatedUser);

                    // Lưu vào localStorage
                    this.userService.saveUserResponseToLocalStorage(updatedUser);

                    // Cập nhật UI
                    this.userResponse = updatedUser;
                    this.populateForm();
                }

                this.toastService.showToast({
                    title: this.translate.instant('COMMON.SUCCESS'),
                    defaultMsg: this.translate.instant('PROFILE.SAVE_SUCCESS')
                });
                this.selectedFile = null;
            },
            error: (err: HttpErrorResponse) => {
                this.saving = false;
                this.toastService.showToast({
                    title: this.translate.instant('COMMON.ERROR'),
                    defaultMsg: err.error?.message || 'Cập nhật thất bại',
                    error: err
                });
            }
        });
    }
}
