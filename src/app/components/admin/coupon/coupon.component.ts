import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CouponService, Coupon } from '../../../services/coupon.service';
import { ApiResponse } from '../../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-coupon',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './coupon.component.html',
  styleUrls: ['./coupon.component.scss']
})
export class CouponComponent implements OnInit {
  coupons: Coupon[] = [];

  constructor(
    private couponService: CouponService,
    private router: Router,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.getCoupons();
  }

  getCoupons() {
    this.couponService.getCoupons().subscribe({
      next: (response: ApiResponse) => {
        this.coupons = response.data;
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Không thể tải danh sách mã giảm giá',
          title: 'Lỗi'
        });
      }
    });
  }

  insertCoupon() {
    this.router.navigate(['/admin/coupons/insert']);
  }

  updateCoupon(couponId: number) {
    this.router.navigate(['/admin/coupons/update', couponId]);
  }

  deleteCoupon(couponId: number) {
    if (confirm('Bạn có chắc chắn muốn xóa mã giảm giá này?')) {
      this.couponService.deleteCoupon(couponId).subscribe({
        next: (response: ApiResponse) => {
          this.toastService.showToast({
            error: null,
            defaultMsg: 'Xóa mã giảm giá thành công',
            title: 'Thành công'
          });
          this.getCoupons();
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.showToast({
            error: error,
            defaultMsg: 'Xóa mã giảm giá thất bại',
            title: 'Lỗi'
          });
        }
      });
    }
  }
}
