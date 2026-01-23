import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { adminRoutes } from './components/admin/admin-routes';
import { RouterModule } from '@angular/router';
import { tokenInterceptor } from './interceptors/token.interceptor';

// i18n
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

// Custom loader cho SSR
class CustomTranslateLoader implements TranslateLoader {
  private translations: { [key: string]: any } = {
    'vi': {
      COMMON: { LOADING: 'Đang tải...', ERROR: 'Lỗi', SUCCESS: 'Thành công', SAVE: 'Lưu', SEARCH: 'Tìm kiếm', CANCEL: 'Hủy', ACTIONS: 'Thao tác' },
      SIDEBAR: {
        MANAGEMENT: 'Quản lý',
        ACCOUNT: 'Tài khoản',
        ORDERS: 'Đơn hàng',
        USERS: 'Người dùng',
        BRANDS: 'Thương hiệu'
      },
      BRAND: {
        TITLE: 'Quản lý Thương hiệu',
        SUBTITLE: 'Thêm, sửa, xóa các thương hiệu sản phẩm',
        ADD_NEW: 'Thêm thương hiệu',
        EDIT: 'Sửa thương hiệu',
        NAME: 'Tên',
        NAME_PLACEHOLDER: 'Nhập tên thương hiệu',
        DESCRIPTION: 'Mô tả',
        DESC_PLACEHOLDER: 'Nhập mô tả (tùy chọn)',
        UPLOAD_LOGO: 'Tải logo',
        EMPTY: 'Chưa có thương hiệu nào'
      },
      NAV: {
        HOME: "Trang chủ", PRODUCTS: "Sản phẩm", CATEGORIES: "Danh mục", CART: "Giỏ hàng",
        LOGIN: "Đăng nhập", REGISTER: "Đăng ký", LOGOUT: "Đăng xuất", PROFILE: "Tài khoản",
        ADMIN: "Quản trị", CHANGE_PASSWORD: "Đổi mật khẩu"
      },
      LOGIN: {
        TITLE: 'Đăng Nhập', EMAIL: 'Email', EMAIL_PLACEHOLDER: 'Nhập email của bạn',
        PASSWORD: 'Mật khẩu', PASSWORD_PLACEHOLDER: 'Nhập mật khẩu', REMEMBER_ME: 'Ghi nhớ đăng nhập',
        FORGOT_PASSWORD: 'Quên mật khẩu?', BUTTON: 'Đăng Nhập', NO_ACCOUNT: 'Chưa có tài khoản?',
        REGISTER: 'Đăng ký ngay', OR: 'HOẶC', WITH_GOOGLE: 'Đăng nhập với Google', WITH_FACEBOOK: 'Đăng nhập với Facebook',
        ERROR: { INVALID_CREDENTIALS: 'Sai email hoặc mật khẩu', ACCOUNT_LOCKED: 'Tài khoản đã bị khóa' },
        VALIDATION: {
          EMAIL_REQUIRED: 'Vui lòng nhập email', EMAIL_INVALID: 'Email không hợp lệ',
          PASSWORD_REQUIRED: 'Vui lòng nhập mật khẩu', PASSWORD_MIN: 'Mật khẩu phải có ít nhất 6 ký tự'
        }
      },
      REGISTER: {
        TITLE: 'Đăng Ký', FULLNAME: 'Họ và tên', FULLNAME_PLACEHOLDER: 'Nhập họ và tên',
        EMAIL: 'Email', EMAIL_PLACEHOLDER: 'Nhập email của bạn',
        PASSWORD: 'Mật khẩu', PASSWORD_PLACEHOLDER: 'Ít nhất 6 ký tự',
        CONFIRM_PASSWORD: 'Xác nhận mật khẩu', CONFIRM_PASSWORD_PLACEHOLDER: 'Nhập lại mật khẩu',
        PHONE: 'Số điện thoại', PHONE_PLACEHOLDER: 'Nhập số điện thoại',
        OPTIONAL: '(Tùy chọn)', ADDRESS: 'Địa chỉ', ADDRESS_PLACEHOLDER: 'Nhập địa chỉ',
        BUTTON: 'Đăng Ký', HAS_ACCOUNT: 'Đã có tài khoản?', LOGIN: 'Đăng nhập',
        SUCCESS: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
        ERROR: { EMAIL_EXISTS: 'Email đã được sử dụng', PASSWORD_MISMATCH: 'Mật khẩu không khớp' },
        VALIDATION: {
          FULLNAME_REQUIRED: 'Vui lòng nhập họ và tên', EMAIL_REQUIRED: 'Vui lòng nhập email',
          EMAIL_INVALID: 'Email không hợp lệ', PASSWORD_REQUIRED: 'Vui lòng nhập mật khẩu',
          PASSWORD_MIN: 'Mật khẩu phải có ít nhất 6 ký tự', CONFIRM_REQUIRED: 'Vui lòng xác nhận mật khẩu'
        }
      },
      PROFILE: {
        TITLE: 'Thông tin cá nhân',
        PERSONAL_INFO: 'Thông tin cá nhân',
        DOB: 'Ngày sinh',
        CURRENT_PASSWORD: 'Mật khẩu hiện tại',
        NEW_PASSWORD: 'Mật khẩu mới',
        CONFIRM_PASSWORD: 'Xác nhận mật khẩu mới',
        CHANGE_PASSWORD_TITLE: 'Đổi mật khẩu',
        CHANGE_PASSWORD_DESC: 'Nhập mật khẩu hiện tại và mật khẩu mới',
        SAVE_SUCCESS: 'Lưu thông tin thành công',
        PASSWORD_CHANGE_SUCCESS: 'Đổi mật khẩu thành công',
        BACK_TO_PROFILE: 'Quay lại Profile',
        VALIDATION: {
          FULLNAME_REQUIRED: 'Vui lòng nhập họ tên',
          FULLNAME_INVALID: 'Họ tên không được chứa số hoặc ký tự đặc biệt',
          PHONE_INVALID: 'Số điện thoại phải là 10 chữ số (VD: 0912345678)',
          CURRENT_PASSWORD_REQUIRED: 'Vui lòng nhập mật khẩu hiện tại',
          NEW_PASSWORD_REQUIRED: 'Vui lòng nhập mật khẩu mới',
          CONFIRM_PASSWORD_REQUIRED: 'Vui lòng xác nhận mật khẩu mới',
          CURRENT_PASSWORD_INCORRECT: 'Mật khẩu hiện tại không đúng',
          PASSWORD_MIN: 'Mật khẩu tối thiểu 6 ký tự',
          PASSWORD_MISMATCH: 'Mật khẩu không khớp'
        }
      },
      FORGOT_PASSWORD: {
        TITLE: "Quên Mật Khẩu", DESC: "Nhập email của bạn để nhận link đặt lại mật khẩu.",
        SEND_BTN: "Gửi Link", CHECK_MAIL: "Kiểm tra Email", SENT_DESC: "Chúng tôi đã gửi link đặt lại mật khẩu đến"
      },
      VERIFY_EMAIL: {
        TITLE: 'Xác Thực Email',
        VERIFYING: 'Đang xác thực email của bạn...',
        SUCCESS: 'Xác thực email thành công!',
        ERROR: 'Xác thực thất bại.',
        LOGIN_BUTTON: 'Đến trang Đăng nhập',
        CHECK_EMAIL: 'Kiểm tra email',
        CHECK_EMAIL_DESC: 'Chúng tôi đã gửi link xác thực đến'
      }
    },
    'en': {
      COMMON: { LOADING: 'Loading...', ERROR: 'Error', SUCCESS: 'Success', SAVE: 'Save', SEARCH: 'Search', CANCEL: 'Cancel', ACTIONS: 'Actions' },
      SIDEBAR: {
        MANAGEMENT: 'Management',
        ACCOUNT: 'Account',
        ORDERS: 'Orders',
        USERS: 'Users',
        BRANDS: 'Brands'
      },
      BRAND: {
        TITLE: 'Brand Management',
        SUBTITLE: 'Add, edit, delete product brands',
        ADD_NEW: 'Add Brand',
        EDIT: 'Edit Brand',
        NAME: 'Name',
        NAME_PLACEHOLDER: 'Enter brand name',
        DESCRIPTION: 'Description',
        DESC_PLACEHOLDER: 'Enter description (optional)',
        UPLOAD_LOGO: 'Upload Logo',
        EMPTY: 'No brands found'
      },
      NAV: {
        HOME: "Home", PRODUCTS: "Products", CATEGORIES: "Categories", CART: "Cart",
        LOGIN: "Login", REGISTER: "Register", LOGOUT: "Logout", PROFILE: "Profile",
        ADMIN: "Admin", CHANGE_PASSWORD: "Change Password"
      },
      LOGIN: {
        TITLE: 'Login', EMAIL: 'Email', EMAIL_PLACEHOLDER: 'Enter your email',
        PASSWORD: 'Password', PASSWORD_PLACEHOLDER: 'Enter your password', REMEMBER_ME: 'Remember me',
        FORGOT_PASSWORD: 'Forgot password?', BUTTON: 'Login', NO_ACCOUNT: "Don't have an account?",
        REGISTER: 'Register now', OR: 'OR', WITH_GOOGLE: 'Login with Google', WITH_FACEBOOK: 'Login with Facebook',
        ERROR: { INVALID_CREDENTIALS: 'Invalid email or password' },
        VALIDATION: {
          EMAIL_REQUIRED: 'Email is required', EMAIL_INVALID: 'Please enter a valid email',
          PASSWORD_REQUIRED: 'Password is required', PASSWORD_MIN: 'Password must be at least 6 characters'
        }
      },
      REGISTER: {
        TITLE: 'Register', FULLNAME: 'Full name', FULLNAME_PLACEHOLDER: 'Enter your full name',
        EMAIL: 'Email', EMAIL_PLACEHOLDER: 'Enter your email',
        PASSWORD: 'Password', PASSWORD_PLACEHOLDER: 'At least 6 characters',
        CONFIRM_PASSWORD: 'Confirm password', CONFIRM_PASSWORD_PLACEHOLDER: 'Re-enter your password',
        PHONE: 'Phone number', PHONE_PLACEHOLDER: 'Enter phone number',
        OPTIONAL: '(Optional)', ADDRESS: 'Address', ADDRESS_PLACEHOLDER: 'Enter address',
        BUTTON: 'Register', HAS_ACCOUNT: 'Already have an account?', LOGIN: 'Login',
        SUCCESS: 'Registration successful! Please check your email to verify.',
        ERROR: { EMAIL_EXISTS: 'Email already exists', PASSWORD_MISMATCH: 'Passwords do not match' },
        VALIDATION: {
          FULLNAME_REQUIRED: 'Full name is required', EMAIL_REQUIRED: 'Email is required',
          EMAIL_INVALID: 'Please enter a valid email', PASSWORD_REQUIRED: 'Password is required',
          PASSWORD_MIN: 'Password must be at least 6 characters', CONFIRM_REQUIRED: 'Please confirm your password'
        }
      },
      PROFILE: {
        TITLE: 'Personal Information',
        PERSONAL_INFO: 'Personal Information',
        DOB: 'Date of Birth',
        CURRENT_PASSWORD: 'Current Password',
        NEW_PASSWORD: 'New Password',
        CONFIRM_PASSWORD: 'Confirm New Password',
        CHANGE_PASSWORD_TITLE: 'Change Password',
        CHANGE_PASSWORD_DESC: 'Enter current password and your new password',
        SAVE_SUCCESS: 'Profile saved successfully',
        PASSWORD_CHANGE_SUCCESS: 'Password changed successfully',
        BACK_TO_PROFILE: 'Back to Profile',
        VALIDATION: {
          FULLNAME_REQUIRED: 'Please enter your full name',
          FULLNAME_INVALID: 'Name must not contain numbers or special characters',
          PHONE_INVALID: 'Phone must be 10 digits (e.g., 0912345678)',
          CURRENT_PASSWORD_REQUIRED: 'Please enter current password',
          NEW_PASSWORD_REQUIRED: 'Please enter new password',
          CONFIRM_PASSWORD_REQUIRED: 'Please confirm new password',
          CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
          PASSWORD_MIN: 'Password must be at least 6 characters',
          PASSWORD_MISMATCH: 'Passwords do not match'
        }
      },
      FORGOT_PASSWORD: {
        TITLE: "Forgot Password", DESC: "Enter your email to receive a password reset link.",
        SEND_BTN: "Send Link", CHECK_MAIL: "Check your Email", SENT_DESC: "We sent a password reset link to"
      },
      VERIFY_EMAIL: {
        TITLE: 'Email Verification',
        VERIFYING: 'Verifying your email...',
        SUCCESS: 'Email verified successfully!',
        ERROR: 'Verification failed.',
        LOGIN_BUTTON: 'Go to Login',
        CHECK_EMAIL: 'Check your email',
        CHECK_EMAIL_DESC: 'We sent a verification link to'
      }
    }
  };

  getTranslation(lang: string): Observable<any> {
    return of(this.translations[lang] || this.translations['vi']);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    importProvidersFrom(RouterModule.forChild(adminRoutes)),
    provideHttpClient(
      withInterceptors([tokenInterceptor]), withFetch()
    ),
    provideClientHydration(),
    // TranslateModule with custom loader
    importProvidersFrom(
      TranslateModule.forRoot({
        fallbackLang: 'vi',
        loader: {
          provide: TranslateLoader,
          useClass: CustomTranslateLoader
        }
      })
    )
  ]
};
