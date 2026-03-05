import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService } from '../../../services/dashboard.service';
import { Chart, registerables } from 'chart.js';

// Đăng ký tất cả chart types
Chart.register(...registerables);

import { CurrencyVndPipe } from '../../../pipes/currency-vnd/currency-vnd.pipe';
import { OrderStatusPipe } from '../../../pipes/order-status/order-status.pipe';
import { PaymentMethodPipe } from '../../../pipes/payment-method/payment-method.pipe';

@Component({
    selector: 'app-dashboard-admin',
    templateUrl: './dashboard.admin.component.html',
    styleUrls: ['./dashboard.admin.component.scss'],
    imports: [CommonModule, RouterModule, CurrencyVndPipe, OrderStatusPipe, PaymentMethodPipe]
})
export class DashboardAdminComponent implements OnInit, OnDestroy, AfterViewInit {

    private dashboardService = inject(DashboardService);
    private ngZone = inject(NgZone);

    // Dữ liệu dashboard
    dashboardData: any = null;
    isLoading = true;
    errorMessage = '';

    // Chart instances để destroy khi component bị hủy
    private revenueChart?: Chart;
    private topProductsChart?: Chart;
    private orderStatusChart?: Chart;

    // ViewChild dạng Setter để bắt kịp khi *ngIf render ra Canvas
    @ViewChild('revenueCanvas') set revenueCanvasSetter(content: ElementRef<HTMLCanvasElement>) {
        if (content && !this.revenueChart) {
            this.revenueCanvas = content;
            this.renderRevenueChart();
        }
    }

    @ViewChild('topProductsCanvas') set topProductsCanvasSetter(content: ElementRef<HTMLCanvasElement>) {
        if (content && !this.topProductsChart) {
            this.topProductsCanvas = content;
            this.renderTopProductsChart();
        }
    }

    @ViewChild('orderStatusCanvas') set orderStatusCanvasSetter(content: ElementRef<HTMLCanvasElement>) {
        if (content && !this.orderStatusChart) {
            this.orderStatusCanvas = content;
            this.renderOrderStatusChart();
        }
    }

    revenueCanvas?: ElementRef<HTMLCanvasElement>;
    topProductsCanvas?: ElementRef<HTMLCanvasElement>;
    orderStatusCanvas?: ElementRef<HTMLCanvasElement>;

    ngOnInit(): void {
        this.loadDashboardData();
    }

    ngAfterViewInit(): void {
        // Charts sẽ tự động render dựa trên Setter của @ViewChild
    }

    ngOnDestroy(): void {
        // Hủy tất cả chart instances để tránh memory leak
        this.revenueChart?.destroy();
        this.topProductsChart?.destroy();
        this.orderStatusChart?.destroy();
    }

    loadDashboardData(): void {
        this.isLoading = true;
        this.dashboardService.getDashboardData().subscribe({
            next: (response) => {
                this.dashboardData = response.data;
                this.isLoading = false;
                // Không cần gọi renderCharts thủ công vì đã đổi ViewChild thành DOM SETTER
                // Khi Angular detect dashboardData thay đổi từ null -> object
                // Thẻ <canvas> sẽ được insert vào DOM => Kéo theo Setter kích hoạt
            },
            error: (err) => {
                this.errorMessage = 'Không thể tải dữ liệu dashboard';
                this.isLoading = false;
                console.error('Dashboard error:', err);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDER CHARTS
    // ═══════════════════════════════════════════════════════════════

    // Các hàm render chart độc lập, sẽ được gọi bởi ViewChild Setters
    // Không cần gọi một loạt


    /**
     * Biểu đồ đường - Doanh thu 7 ngày gần nhất
     */
    private renderRevenueChart(): void {
        if (!this.revenueCanvas || !this.dashboardData.revenue_chart) return;

        const ctx = this.revenueCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const labels = this.dashboardData.revenue_chart.map((item: any) => item.date);
        const data = this.dashboardData.revenue_chart.map((item: any) => item.revenue);

        this.ngZone.runOutsideAngular(() => {
            this.revenueChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Doanh thu (VNĐ)',
                        data,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#4CAF50',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const value = ctx.parsed.y ?? 0;
                                    return new Intl.NumberFormat('vi-VN', {
                                        style: 'currency',
                                        currency: 'VND',
                                        maximumFractionDigits: 0
                                    }).format(value);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => {
                                    const num = value as number;
                                    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                                    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
                                    return num.toString();
                                }
                            },
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                maxTicksLimit: 10,
                                maxRotation: 45,
                                minRotation: 0
                            }
                        }
                    }
                }
            });
        });
    }

    /**
     * Biểu đồ cột - Top 5 sản phẩm bán chạy
     */
    private renderTopProductsChart(): void {
        if (!this.topProductsCanvas || !this.dashboardData.top_products) return;

        const ctx = this.topProductsCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const labels = this.dashboardData.top_products.map((item: any) =>
            item.product_name.length > 25
                ? item.product_name.substring(0, 25) + '...'
                : item.product_name
        );
        const data = this.dashboardData.top_products.map((item: any) => item.total_sold);

        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'];

        this.ngZone.runOutsideAngular(() => {
            this.topProductsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Số lượng bán',
                        data,
                        backgroundColor: colors.slice(0, data.length),
                        borderRadius: 8,
                        borderSkipped: false,
                        maxBarThickness: 40 // Giới hạn độ dày cột
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 },
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        y: {
                            grid: { display: false }
                        }
                    }
                }
            });
        });
    }

    /**
     * Biểu đồ tròn - Trạng thái đơn hàng
     */
    private renderOrderStatusChart(): void {
        if (!this.orderStatusCanvas || !this.dashboardData.order_status_chart) return;

        const ctx = this.orderStatusCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const statusLabels: { [key: string]: string } = {
            'pending': 'Chờ xử lý',
            'processing': 'Đang xử lý',
            'shipped': 'Đang giao',
            'delivered': 'Đã giao',
            'cancelled': 'Đã hủy'
        };

        const statusColors: { [key: string]: string } = {
            'pending': '#FF9800',
            'processing': '#2196F3',
            'shipped': '#00BCD4',
            'delivered': '#4CAF50',
            'cancelled': '#F44336'
        };

        const labels = this.dashboardData.order_status_chart.map(
            (item: any) => statusLabels[item.status] || item.status
        );
        const data = this.dashboardData.order_status_chart.map((item: any) => item.count);
        const colors = this.dashboardData.order_status_chart.map(
            (item: any) => statusColors[item.status] || '#9E9E9E'
        );

        this.ngZone.runOutsideAngular(() => {
            this.orderStatusChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data,
                        backgroundColor: colors,
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 16,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Mảng tĩnh để hiển thị sao đánh giá (tránh infinite loop trong Angular Change Detection)
     */
    readonly stars = [1, 2, 3, 4, 5];
}
