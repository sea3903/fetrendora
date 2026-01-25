import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CouponService, Coupon, CouponCondition } from '../../../../services/coupon.service';
import { ApiResponse } from '../../../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'app-detail-coupon',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './detail-coupon.component.html',
  styleUrls: ['./detail-coupon.component.scss']
})
export class DetailCouponComponent implements OnInit {
  couponId: number = 0;
  coupon: Coupon = {
    code: '',
    active: true,
    conditions: []
  };
  isUpdateMode: boolean = false;

  // Options cho select
  attributeOptions = [
    { value: 'minimum_amount', label: 'Tối thiểu đơn hàng' },
    { value: 'applicable_date', label: 'Ngày áp dụng' }
  ];

  operatorOptions = [
    { value: '>', label: 'Lớn hơn (>)' },
    { value: 'BETWEEN', label: 'Trong khoảng (BETWEEN)' },
    { value: '=', label: 'Bằng (=)' }
  ];

  constructor(
    private couponService: CouponService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    // Check route param
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'insert') {
      this.couponId = +idParam;
      this.isUpdateMode = true;
      this.getCouponDetail(this.couponId);
    }
  }

  getCouponDetail(id: number) {
    this.couponService.getCouponById(id).subscribe({
      next: (response: ApiResponse) => {
        this.coupon = response.data;
        // Backend có thể trả về conditions null nếu không có
        if (!this.coupon.conditions) {
          this.coupon.conditions = [];
        }
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Không thể tải chi tiết mã giảm giá',
          title: 'Lỗi'
        });
        this.router.navigate(['/admin/coupons']);
      }
    });
  }

  addCondition(type: 'amount' | 'date') {
    if (!this.coupon.conditions) {
      this.coupon.conditions = [];
    }

    let newCondition: CouponCondition;

    if (type === 'amount') {
      newCondition = {
        attribute: 'minimum_amount',
        operator: '>',
        value: '',
        discount_amount: 0
      };
    } else {
      newCondition = {
        attribute: 'applicable_date',
        operator: 'BETWEEN', // Mặc định BETWEEN cho ngày
        value: '', // Format YYYY-MM-DD
        discount_amount: 0
      };
    }

    this.coupon.conditions.push(newCondition);
  }

  removeCondition(index: number) {
    if (this.coupon.conditions) {
      this.coupon.conditions.splice(index, 1);
    }
  }

  saveCoupon() {
    // Basic validation
    if (!this.coupon.code) {
      this.toastService.showToast({ error: null, defaultMsg: 'Vui lòng nhập mã Coupon', title: 'Lỗi' });
      return;
    }

    if (this.isUpdateMode) {
      this.couponService.updateCoupon(this.couponId, this.coupon).subscribe({
        next: (response: ApiResponse) => {
          this.toastService.showToast({
            error: null,
            defaultMsg: 'Cập nhật mã giảm giá thành công',
            title: 'Thành công'
          });
          this.router.navigate(['/admin/coupons']);
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.showToast({
            error: error,
            defaultMsg: 'Cập nhật thất bại',
            title: 'Lỗi'
          });
        }
      });
    } else {
      this.couponService.createCoupon(this.coupon).subscribe({
        next: (response: ApiResponse) => {
          this.toastService.showToast({
            error: null,
            defaultMsg: 'Tạo mã giảm giá thành công',
            title: 'Thành công'
          });
          this.router.navigate(['/admin/coupons']);
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.showToast({
            error: error,
            defaultMsg: 'Tạo mã thất bại. Kiểm tra lại mã code có bị trùng không.',
            title: 'Lỗi'
          });
        }
      });
    }
  }
}
