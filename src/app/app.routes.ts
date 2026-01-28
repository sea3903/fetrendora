import { NgModule, importProvidersFrom } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DetailProductComponent } from './components/detail-product/detail-product.component';
import { OrderComponent } from './components/order/order.component';
import { OrderDetailComponent } from './components/detail-order/order.detail.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { AdminComponent } from './components/admin/admin.component';
import { AuthGuardFn } from './guards/auth.guard';
import { AdminGuardFn } from './guards/admin.guard';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { PaymentCallbackComponent } from './payment-callback/payment-callback.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { MyOrdersComponent } from './components/my-orders/my-orders.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'coupons', loadComponent: () => import('./components/common/coupon-gallery/coupon-gallery.component').then(m => m.CouponGalleryComponent) },
  { path: 'login', component: LoginComponent },
  { path: 'auth/google/callback', component: AuthCallbackComponent },
  { path: 'auth/facebook/callback', component: AuthCallbackComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'products/:id', component: DetailProductComponent },
  // Giỏ hàng
  { path: 'cart', component: OrderComponent, canActivate: [AuthGuardFn] },
  // Thanh toán
  { path: 'checkout', component: CheckoutComponent, canActivate: [AuthGuardFn] },
  // Lịch sử đơn hàng (MỚI)
  { path: 'my-orders', component: MyOrdersComponent, canActivate: [AuthGuardFn] },

  // Route orders cũ trỏ về detail - giữ nguyên để không break link khác
  { path: 'orders', component: OrderDetailComponent, canActivate: [AuthGuardFn] },
  { path: 'orders/:id', component: OrderDetailComponent },

  { path: 'user-profile', component: UserProfileComponent, canActivate: [AuthGuardFn] },

  { path: 'change-password', component: ChangePasswordComponent, canActivate: [AuthGuardFn] },
  // Admin   
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AdminGuardFn]
  },
  // VnPay Return
  { path: 'payments/payment-callback', component: PaymentCallbackComponent }
];
