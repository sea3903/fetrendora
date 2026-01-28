import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService, StockItem, InventoryTransaction, MonthlyReport, InventoryImportDTO, InventoryAdjustDTO } from '../../../services/inventory.service';
import { CategoryService } from '../../../services/category.service';
import { ToastService } from '../../../services/toast.service';
import { environment } from '../../../../environments/environment';

interface Category {
    id: number;
    name: string;
}

// Nhóm Product với các biến thể
interface ProductStockGroup {
    productId: number;
    productName: string;
    thumbnail: string;
    categoryName: string;
    brandName: string;
    totalVariants: number;
    totalStock: number;
    hasLowStock: boolean;
    hasOutOfStock: boolean;
    expanded: boolean;
    variants: StockItem[];
}

@Component({
    selector: 'app-inventory-admin',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './inventory.admin.component.html',
    styleUrls: ['./inventory.admin.component.scss']
})
export class InventoryAdminComponent implements OnInit {
    // =============== STATE ===============
    activeTab: 'stock' | 'report' = 'stock';
    apiBaseUrl = environment.apiBaseUrl;

    // Stock List - Grouped by Product
    productGroups: ProductStockGroup[] = [];
    totalProducts = 0;
    currentPage = 0;
    pageSize = 20;
    totalPages = 0;

    // Filters
    searchKeyword = '';
    selectedStockStatus = '';
    selectedCategoryId: number | null = null;
    categories: Category[] = [];

    // Loading states
    isLoading = false;
    isLoadingHistory = false;

    // Modals
    showImportModal = false;
    showAdjustModal = false;
    showHistoryModal = false;

    // Forms
    importForm!: FormGroup;
    adjustForm!: FormGroup;

    // History
    selectedItem: StockItem | null = null;
    transactionHistory: InventoryTransaction[] = [];
    historyPage = 0;
    historyTotalPages = 0;

    // Report
    reportYear: number = new Date().getFullYear();
    reportMonth: number = new Date().getMonth() + 1;
    monthlyReport: MonthlyReport | null = null;
    isLoadingReport = false;

    constructor(
        private inventoryService: InventoryService,
        private categoryService: CategoryService,
        private toastService: ToastService,
        private fb: FormBuilder
    ) {
        this.initForms();
    }

    ngOnInit(): void {
        this.loadStockList();
        this.loadCategories();
    }

    // =============== INIT FORMS ===============
    initForms(): void {
        this.importForm = this.fb.group({
            product_detail_id: [null, Validators.required],
            quantity: [1, [Validators.required, Validators.min(1)]],
            note: ['']
        });

        this.adjustForm = this.fb.group({
            product_detail_id: [null, Validators.required],
            current_quantity: [{ value: 0, disabled: true }],
            new_quantity: [0, [Validators.required, Validators.min(0)]],
            reason: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
        });
    }

    // =============== IMAGE URL ===============
    getImageUrl(thumbnail: string | null): string {
        if (!thumbnail) return 'assets/images/no-image.png';
        if (thumbnail.startsWith('http')) return thumbnail;
        return `${this.apiBaseUrl}/products/images/${thumbnail}`;
    }

    // =============== LOAD DATA ===============
    loadStockList(): void {
        this.isLoading = true;
        this.inventoryService.getStockList({
            keyword: this.searchKeyword || undefined,
            stock_status: this.selectedStockStatus || undefined,
            category_id: this.selectedCategoryId || undefined,
            page: 0,
            size: 1000 // Lấy tất cả để group, sau đó pagination client-side
        }).subscribe({
            next: (res) => {
                const allItems: StockItem[] = res.data.content || [];
                this.groupStockByProduct(allItems);
                this.isLoading = false;
            },
            error: (err) => {
                this.toastService.showToast({ error: err, defaultMsg: 'Lỗi tải danh sách tồn kho' });
                this.isLoading = false;
            }
        });
    }

    // =============== GROUP BY PRODUCT ===============
    groupStockByProduct(items: StockItem[]): void {
        const groupMap = new Map<number, ProductStockGroup>();

        for (const item of items) {
            const productId = item.product_id || 0;

            if (!groupMap.has(productId)) {
                groupMap.set(productId, {
                    productId,
                    productName: item.product_name || 'Không xác định',
                    thumbnail: item.product_thumbnail || '',
                    categoryName: item.category_name || '',
                    brandName: item.brand_name || '',
                    totalVariants: 0,
                    totalStock: 0,
                    hasLowStock: false,
                    hasOutOfStock: false,
                    expanded: false,
                    variants: []
                });
            }

            const group = groupMap.get(productId)!;
            group.variants.push(item);
            group.totalVariants++;
            group.totalStock += item.stock_quantity || 0;

            if (item.stock_status === 'LOW') group.hasLowStock = true;
            if (item.stock_status === 'OUT_OF_STOCK') group.hasOutOfStock = true;
        }

        // Chuyển thành array và sắp xếp: hết hàng > sắp hết > bình thường
        let groups = Array.from(groupMap.values());
        groups.sort((a, b) => {
            if (a.hasOutOfStock !== b.hasOutOfStock) return a.hasOutOfStock ? -1 : 1;
            if (a.hasLowStock !== b.hasLowStock) return a.hasLowStock ? -1 : 1;
            return a.productName.localeCompare(b.productName);
        });

        // Pagination
        this.totalProducts = groups.length;
        this.totalPages = Math.ceil(groups.length / this.pageSize);
        const start = this.currentPage * this.pageSize;
        const end = start + this.pageSize;
        this.productGroups = groups.slice(start, end);
    }

    loadCategories(): void {
        this.categoryService.getCategories().subscribe({
            next: (res: any) => {
                this.categories = res.data || res || [];
            },
            error: () => { }
        });
    }

    // =============== EXPAND/COLLAPSE ===============
    toggleExpand(group: ProductStockGroup): void {
        group.expanded = !group.expanded;
    }

    // =============== SEARCH & FILTER ===============
    onSearch(): void {
        this.currentPage = 0;
        this.loadStockList();
    }

    onFilterChange(): void {
        this.currentPage = 0;
        this.loadStockList();
    }

    resetFilters(): void {
        this.searchKeyword = '';
        this.selectedStockStatus = '';
        this.selectedCategoryId = null;
        this.currentPage = 0;
        this.loadStockList();
    }

    // =============== PAGINATION ===============
    onPageChange(page: number): void {
        if (page >= 0 && page < this.totalPages) {
            this.currentPage = page;
            this.loadStockList();
        }
    }

    getVisiblePages(): number[] {
        const pages: number[] = [];
        const start = Math.max(0, this.currentPage - 2);
        const end = Math.min(this.totalPages - 1, this.currentPage + 2);
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    }

    // =============== IMPORT MODAL ===============
    openImportModal(item: StockItem): void {
        this.importForm.patchValue({
            product_detail_id: item.product_detail_id,
            quantity: 1,
            note: ''
        });
        this.selectedItem = item;
        this.showImportModal = true;
    }

    closeImportModal(): void {
        this.showImportModal = false;
        this.importForm.reset({ quantity: 1 });
    }

    saveImport(): void {
        if (this.importForm.invalid) {
            this.toastService.showToast({ error: 'validation', defaultMsg: 'Vui lòng nhập đầy đủ thông tin' });
            return;
        }

        const dto: InventoryImportDTO = this.importForm.value;
        this.inventoryService.importStock(dto).subscribe({
            next: () => {
                this.toastService.showToast({ defaultMsg: 'Nhập kho thành công', title: 'Thành công' });
                this.closeImportModal();
                this.loadStockList();
            },
            error: (err) => {
                this.toastService.showToast({ error: err, defaultMsg: 'Lỗi nhập kho' });
            }
        });
    }

    // =============== ADJUST MODAL ===============
    openAdjustModal(item: StockItem): void {
        this.selectedItem = item;
        this.adjustForm.patchValue({
            product_detail_id: item.product_detail_id,
            current_quantity: item.stock_quantity,
            new_quantity: item.stock_quantity,
            reason: ''
        });
        this.showAdjustModal = true;
    }

    closeAdjustModal(): void {
        this.showAdjustModal = false;
        this.adjustForm.reset();
    }

    saveAdjust(): void {
        if (this.adjustForm.invalid) {
            Object.keys(this.adjustForm.controls).forEach(key => {
                this.adjustForm.get(key)?.markAsTouched();
            });
            return;
        }

        const formValue = this.adjustForm.getRawValue();
        if (formValue.new_quantity === formValue.current_quantity) {
            this.toastService.showToast({ error: 'validation', defaultMsg: 'Số lượng mới phải khác số lượng hiện tại' });
            return;
        }

        const dto: InventoryAdjustDTO = {
            product_detail_id: formValue.product_detail_id,
            new_quantity: formValue.new_quantity,
            reason: formValue.reason
        };

        this.inventoryService.adjustStock(dto).subscribe({
            next: () => {
                this.toastService.showToast({ defaultMsg: 'Điều chỉnh tồn kho thành công', title: 'Thành công' });
                this.closeAdjustModal();
                this.loadStockList();
            },
            error: (err) => {
                this.toastService.showToast({ error: err, defaultMsg: 'Lỗi điều chỉnh' });
            }
        });
    }

    // =============== HISTORY MODAL ===============
    openHistoryModal(item: StockItem): void {
        this.selectedItem = item;
        this.historyPage = 0;
        this.transactionHistory = [];
        this.showHistoryModal = true;
        this.isLoadingHistory = true;
        this.loadTransactionHistory();
    }

    closeHistoryModal(): void {
        this.showHistoryModal = false;
        this.transactionHistory = [];
    }

    loadTransactionHistory(): void {
        if (!this.selectedItem) return;

        this.isLoadingHistory = true;
        this.inventoryService.getTransactionHistory(
            this.selectedItem.product_detail_id,
            this.historyPage,
            10
        ).subscribe({
            next: (res) => {
                const pageData = res.data;
                this.transactionHistory = pageData.content || [];
                this.historyTotalPages = pageData.totalPages || 0;
                this.isLoadingHistory = false;
            },
            error: (err) => {
                this.toastService.showToast({ error: err, defaultMsg: 'Lỗi tải lịch sử giao dịch' });
                this.isLoadingHistory = false;
            }
        });
    }

    onHistoryPageChange(page: number): void {
        if (page >= 0 && page < this.historyTotalPages) {
            this.historyPage = page;
            this.loadTransactionHistory();
        }
    }

    // =============== TAB SWITCH ===============
    switchTab(tab: 'stock' | 'report'): void {
        this.activeTab = tab;
        if (tab === 'report' && !this.monthlyReport) {
            this.loadMonthlyReport();
        }
    }

    // =============== MONTHLY REPORT ===============
    loadMonthlyReport(): void {
        this.isLoadingReport = true;
        this.inventoryService.getMonthlyReport(this.reportYear, this.reportMonth).subscribe({
            next: (res) => {
                this.monthlyReport = res.data;
                this.isLoadingReport = false;
            },
            error: (err) => {
                this.toastService.showToast({ error: err, defaultMsg: 'Lỗi tải báo cáo' });
                this.isLoadingReport = false;
            }
        });
    }

    onReportPeriodChange(): void {
        if (this.reportMonth >= 1 && this.reportMonth <= 12 && this.reportYear >= 2020) {
            this.loadMonthlyReport();
        }
    }

    // =============== EXPORT EXCEL (CHI TIẾT) ===============
    exportExcel(): void {
        if (!this.monthlyReport) return;

        const period = `Tháng ${this.reportMonth}/${this.reportYear}`;
        const exportDate = new Date().toLocaleDateString('vi-VN');

        // Header báo cáo
        let csv = '';
        csv += `BÁO CÁO TỒN KHO THÁNG ${this.reportMonth}/${this.reportYear}\n`;
        csv += `Ngày xuất: ${exportDate}\n`;
        csv += `\n`;

        // Thống kê tổng quan
        csv += `=== TỔNG QUAN ===\n`;
        csv += `Tổng số biến thể,${this.monthlyReport.summary.total_variants}\n`;
        csv += `Giá trị tồn kho,${this.monthlyReport.summary.total_stock_value}\n`;
        csv += `Sắp hết hàng,${this.monthlyReport.summary.low_stock_count}\n`;
        csv += `Hết hàng,${this.monthlyReport.summary.out_of_stock_count}\n`;
        csv += `\n`;

        // Biến động trong tháng
        csv += `=== BIẾN ĐỘNG TRONG THÁNG ===\n`;
        csv += `Tổng nhập kho,+${this.monthlyReport.movements.total_import}\n`;
        csv += `Tổng xuất kho (bán),-${this.monthlyReport.movements.total_export}\n`;
        csv += `Tổng điều chỉnh,${this.monthlyReport.movements.total_adjustment}\n`;
        csv += `Tổng hoàn trả,+${this.monthlyReport.movements.total_return}\n`;
        csv += `\n`;

        // Chi tiết từng biến thể
        csv += `=== CHI TIẾT TỒN KHO ===\n`;
        const headers = [
            'STT',
            'SKU',
            'Tên sản phẩm',
            'Màu sắc',
            'Kích thước',
            'Xuất xứ',
            'Đơn giá',
            'Tồn đầu kỳ',
            'Nhập trong kỳ',
            'Xuất trong kỳ',
            'Điều chỉnh',
            'Hoàn trả',
            'Tồn cuối kỳ',
            'Giá trị tồn kho',
            'Trạng thái'
        ];
        csv += headers.join(',') + '\n';

        this.monthlyReport.details.forEach((d, index) => {
            const statusLabel = d.stock_status === 'OUT_OF_STOCK' ? 'Hết hàng'
                : d.stock_status === 'LOW' ? 'Sắp hết' : 'Bình thường';
            const row = [
                index + 1,
                `"${d.sku || ''}"`,
                `"${d.product_name || ''}"`,
                `"${d.color_name || '-'}"`,
                `"${d.size_name || '-'}"`,
                `"${d.origin_name || '-'}"`,
                d.price || 0,
                d.opening_stock || 0,
                d.total_import || 0,
                d.total_export || 0,
                d.total_adjustment || 0,
                d.total_return || 0,
                d.closing_stock || 0,
                d.stock_value || 0,
                `"${statusLabel}"`
            ];
            csv += row.join(',') + '\n';
        });

        // Tổng cộng
        csv += `\n`;
        csv += `=== TỔNG CỘNG ===\n`;
        const totalOpening = this.monthlyReport.details.reduce((sum, d) => sum + (d.opening_stock || 0), 0);
        const totalClosing = this.monthlyReport.details.reduce((sum, d) => sum + (d.closing_stock || 0), 0);
        csv += `Tổng tồn đầu kỳ,${totalOpening}\n`;
        csv += `Tổng tồn cuối kỳ,${totalClosing}\n`;
        csv += `Tổng giá trị,${this.monthlyReport.summary.total_stock_value}\n`;

        // BOM for UTF-8
        const bom = '\uFEFF';
        const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `bao_cao_ton_kho_T${this.reportMonth}_${this.reportYear}.csv`;
        link.click();

        this.toastService.showToast({ defaultMsg: 'Xuất báo cáo Excel thành công', title: 'Thành công' });
    }

    // =============== HELPERS ===============
    getStockStatusClass(status: string): string {
        switch (status) {
            case 'OUT_OF_STOCK': return 'status-danger';
            case 'LOW': return 'status-warning';
            default: return 'status-success';
        }
    }

    getStockStatusLabel(status: string): string {
        switch (status) {
            case 'OUT_OF_STOCK': return 'Hết hàng';
            case 'LOW': return 'Sắp hết';
            default: return 'Còn hàng';
        }
    }

    getTransactionTypeClass(type: string): string {
        switch (type) {
            case 'IMPORT': return 'type-import';
            case 'EXPORT': return 'type-export';
            case 'ADJUSTMENT': return 'type-adjust';
            case 'RETURN': return 'type-return';
            default: return '';
        }
    }

    getVariantDisplay(item: StockItem): string {
        const parts: string[] = [];
        if (item.color_name) parts.push(item.color_name);
        if (item.size_name) parts.push(item.size_name);
        if (item.origin_name) parts.push(item.origin_name);
        return parts.length > 0 ? parts.join(' / ') : 'Mặc định';
    }
}
