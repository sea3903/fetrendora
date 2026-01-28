import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { CouponService, Coupon } from '../../../services/coupon.service';
import { ApiResponse } from '../../../responses/api.response';
import { ToastService } from '../../../services/toast.service';
import { HeaderComponent } from '../../header/header.component';
import { FooterComponent } from '../../footer/footer.component';

@Component({
    selector: 'app-coupon-gallery',
    standalone: true,
    imports: [CommonModule, HeaderComponent, FooterComponent],
    templateUrl: './coupon-gallery.component.html',
    styleUrls: ['./coupon-gallery.component.scss']
})
export class CouponGalleryComponent implements OnInit {
    activeCoupons: Coupon[] = [];
    loading = true;

    private couponService = inject(CouponService);
    private toastService = inject(ToastService);
    private location = inject(Location);

    ngOnInit() {
        this.loadCoupons();
    }

    goBack() {
        this.location.back();
    }

    loadCoupons() {
        this.couponService.getCoupons().subscribe({
            next: (response: ApiResponse) => {
                const now = new Date();
                const rawCoupons = response.data || [];

                // Filter active coupons: active = true AND current date within range
                this.activeCoupons = rawCoupons
                    .map((c: any) => this.mapCouponData(c))
                    .filter((c: Coupon) => {
                        if (!c.active) return false;

                        // Check usage limit if necessary (optional)
                        // if (c.usage_limit && c.usage_limit <= 0) return false;

                        // Check date range
                        if (c.startDateParsed && c.startDateParsed > now) return false;
                        if (c.endDateParsed && c.endDateParsed < now) return false;

                        return true;
                    });

                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load coupons', err);
                this.loading = false;
            }
        });
    }

    mapCouponData(c: any): Coupon {
        const parseDate = (d: any): Date | null => {
            if (!d) return null;
            if (Array.isArray(d)) {
                const [y, m, day, h = 0, min = 0] = d;
                return new Date(y, m - 1, day, h, min);
            }
            return new Date(d.toString().replace(' ', 'T'));
        };

        const categoryId = c.category?.id || c.categoryId || c.category_id;
        const productId = c.product?.id || c.productId || c.product_id;
        let scope: 'global' | 'category' | 'product' = 'global';
        if (productId) scope = 'product';
        else if (categoryId) scope = 'category';

        return {
            ...c,
            category_id: categoryId,
            product_id: productId,
            scope,
            startDateParsed: parseDate(c.startDate || c.start_date),
            endDateParsed: parseDate(c.endDate || c.end_date),
            categoryName: c.category?.name,
            productName: c.product?.name
        };
    }

    copyCode(code: string) {
        if (!code) return;
        navigator.clipboard.writeText(code).then(() => {
            this.toastService.showToast({
                title: 'Thành công',
                defaultMsg: `Đã sao chép mã ${code}`
            });
        }).catch(() => {
            // Fallback for some browsers
            const textArea = document.createElement("textarea");
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            this.toastService.showToast({
                title: 'Thành công',
                defaultMsg: `Đã sao chép mã ${code}`
            });
        });
    }
}
