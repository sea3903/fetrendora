import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserResponse } from '../../../responses/user/user.response';
import { ApiResponse } from '../../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast.service';
import { environment } from '../../../../environments/environment';
import { Role } from '../../../models/role';

@Component({
  selector: 'app-user-admin',
  templateUrl: './user.admin.component.html',
  styleUrls: ['./user.admin.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class UserAdminComponent implements OnInit {
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  // Data
  users: UserResponse[] = [];
  filteredUsers: UserResponse[] = [];
  roles: Role[] = [];
  loading = false;
  apiBaseUrl = environment.apiBaseUrl;

  // Search & Pagination
  keyword = '';
  currentPage = 0;
  itemsPerPage = 10;
  totalPages = 0;
  visiblePages: number[] = [];

  // Tabs
  activeTab: 'active' | 'blocked' = 'active';

  // Modal
  showModal = false;
  modalMode: 'edit' | 'role' | 'resetPassword' = 'edit';
  selectedUser: UserResponse | null = null;
  selectedRoleId: number = 0;
  newPassword = '';
  saving = false;

  // Validation errors
  errors: {
    fullname?: string;
    phone_number?: string;
    date_of_birth?: string;
  } = {};

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (response: ApiResponse) => {
        this.roles = response.data || [];
      },
      error: () => { }
    });
  }

  loadUsers(): void {
    this.loading = true;
    const params = { keyword: this.keyword, page: this.currentPage, limit: this.itemsPerPage };

    const observable = this.activeTab === 'active'
      ? this.userService.getUsers(params)
      : this.userService.getBlockedUsers(params);

    observable.subscribe({
      next: (response: ApiResponse) => {
        this.loading = false;
        const data = response.data;
        this.users = data.users || [];
        this.totalPages = data.totalPages || 0;
        this.applyFilter();
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.toastService.showToast({
          title: 'Lỗi',
          defaultMsg: 'Không thể tải danh sách người dùng',
          error: error
        });
      }
    });
  }

  applyFilter(): void {
    this.filteredUsers = this.users;
    this.updateVisiblePages();
  }

  updateVisiblePages(): void {
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage + 1 - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    this.visiblePages = pages;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }

  search(): void {
    this.currentPage = 0;
    this.loadUsers();
  }

  switchTab(tab: 'active' | 'blocked'): void {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.currentPage = 0;
      this.keyword = '';
      this.loadUsers();
    }
  }

  // Utils
  getAvatarUrl(user: UserResponse): string {
    if (user.profile_image && user.profile_image.trim() !== '') {
      if (user.profile_image.startsWith('http')) {
        return user.profile_image;
      }
      return `${this.apiBaseUrl}/users/profile-images/${user.profile_image}`;
    }
    return '';
  }

  getAccountType(user: UserResponse): string {
    if (user.google_account_id && user.google_account_id !== '0' && user.google_account_id.trim() !== '') {
      return 'Google';
    }
    if (user.facebook_account_id && user.facebook_account_id !== '0' && user.facebook_account_id.trim() !== '') {
      return 'Facebook';
    }
    return 'Đăng ký';
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN');
  }

  // Modal
  openEditModal(user: UserResponse): void {
    this.modalMode = 'edit';
    this.selectedUser = { ...user };
    this.selectedRoleId = user.role?.id || 0;

    // FIX: Format date to YYYY-MM-DD for input[type="date"]
    if (this.selectedUser.date_of_birth) {
      try {
        // Handle various date formats (timestamp, ISO string, or Date object)
        const dateVal = new Date(this.selectedUser.date_of_birth);
        // Check if date is valid
        if (!isNaN(dateVal.getTime())) {
          // Format as YYYY-MM-DD manually to avoid timezone issues
          // We use local time components to get the unexpected date
          const year = dateVal.getFullYear();
          const month = ('0' + (dateVal.getMonth() + 1)).slice(-2);
          const day = ('0' + dateVal.getDate()).slice(-2);

          // Angular template expects string for date input
          // We need to cast or use 'any' if TypeScript complains about type mismatch
          (this.selectedUser.date_of_birth as any) = `${year}-${month}-${day}`;
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    }

    this.showModal = true;
  }

  openRoleModal(user: UserResponse): void {
    this.modalMode = 'role';
    this.selectedUser = user;
    this.selectedRoleId = user.role?.id || 0;
    this.showModal = true;
  }

  openResetPasswordModal(user: UserResponse): void {
    this.modalMode = 'resetPassword';
    this.selectedUser = user;
    this.newPassword = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedUser = null;
    this.newPassword = '';
    this.errors = {};
  }

  // Validation
  validateForm(): boolean {
    this.errors = {};
    let valid = true;

    // Validate fullname
    if (!this.selectedUser?.fullname || this.selectedUser.fullname.trim() === '') {
      this.errors.fullname = 'Vui lòng nhập họ tên';
      valid = false;
    } else {
      // Allow Vietnamese characters and spaces
      // Expanded regex to cover more cases
      const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂẵếưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;
      if (!nameRegex.test(this.selectedUser.fullname.trim())) {
        this.errors.fullname = 'Họ tên chỉ được chứa chữ cái';
        valid = false;
      }
    }

    // Validate phone
    if (this.selectedUser?.phone_number && this.selectedUser.phone_number.trim() !== '') {
      const phone = this.selectedUser.phone_number.trim();
      const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;
      if (!phoneRegex.test(phone)) {
        this.errors.phone_number = 'Số điện thoại không hợp lệ (10 số)';
        valid = false;
      }
    }

    // Validate Date of Birth (cannot be in future)
    // Note: selectedUser.date_of_birth is now a string thanks to openEditModal, or undefined
    if (this.selectedUser?.date_of_birth) {
      const dob = new Date(this.selectedUser.date_of_birth);
      const now = new Date();
      if (dob > now) {
        // We don't have a specific field error for DOB in 'errors' object definition yet,
        // but we can add one or use toast. For now, let's treat it generic or add to errors.
        // Let's add 'date_of_birth' to errors object in component definition first implicitly
        (this.errors as any).date_of_birth = 'Ngày sinh không được lớn hơn hiện tại';
        valid = false;
      }
    }

    return valid;
  }

  // Actions
  saveUser(): void {
    if (!this.selectedUser) return;

    if (!this.validateForm()) {
      return;
    }

    this.saving = true;

    const updateData = {
      fullname: this.selectedUser.fullname?.trim(),
      phone_number: this.selectedUser.phone_number?.trim() || '',
      address: this.selectedUser.address?.trim() || '',
      date_of_birth: this.selectedUser.date_of_birth,
      role_id: this.selectedRoleId
    };

    this.userService.adminUpdateUser(this.selectedUser.id, updateData).subscribe({
      next: () => {
        this.saving = false;
        this.toastService.showToast({
          title: 'Thành công',
          defaultMsg: 'Đã cập nhật thông tin'
        });
        this.closeModal();
        this.loadUsers();
      },
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        this.toastService.showToast({
          title: 'Lỗi',
          defaultMsg: 'Không thể cập nhật thông tin',
          error: error
        });
      }
    });
  }

  resetPassword(): void {
    if (!this.selectedUser) return;

    this.saving = true;
    this.userService.resetPassword(this.selectedUser.id).subscribe({
      next: (response: ApiResponse) => {
        this.saving = false;
        this.newPassword = response.data;
        this.toastService.showToast({
          title: 'Thành công',
          defaultMsg: `Mật khẩu mới: ${this.newPassword}`
        });
      },
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        this.toastService.showToast({
          title: 'Lỗi',
          defaultMsg: 'Không thể reset mật khẩu',
          error: error
        });
      }
    });
  }

  blockUser(user: UserResponse): void {
    if (!confirm(`Bạn có chắc muốn khóa tài khoản "${user.fullname}"?`)) return;

    this.userService.toggleUserStatus({ userId: user.id, enable: false }).subscribe({
      next: () => {
        this.toastService.showToast({
          title: 'Thành công',
          defaultMsg: 'Đã khóa tài khoản'
        });
        this.loadUsers();
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          title: 'Lỗi',
          defaultMsg: 'Không thể khóa tài khoản',
          error: error
        });
      }
    });
  }

  unblockUser(user: UserResponse): void {
    if (!confirm(`Bạn có chắc muốn mở khóa tài khoản "${user.fullname}"?`)) return;

    this.userService.toggleUserStatus({ userId: user.id, enable: true }).subscribe({
      next: () => {
        this.toastService.showToast({
          title: 'Thành công',
          defaultMsg: 'Đã mở khóa tài khoản'
        });
        this.loadUsers();
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          title: 'Lỗi',
          defaultMsg: 'Không thể mở khóa tài khoản',
          error: error
        });
      }
    });
  }
}
