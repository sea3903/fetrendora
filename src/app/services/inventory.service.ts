import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// =============== INTERFACES ===============

export interface StockItem {
    product_detail_id: number;
    product_id: number;
    product_name: string;
    product_thumbnail: string;
    sku: string;
    color_id: number | null;
    color_name: string | null;
    color_code: string | null;
    size_id: number | null;
    size_name: string | null;
    origin_id: number | null;
    origin_name: string | null;
    price: number;
    stock_quantity: number;
    stock_status: 'NORMAL' | 'LOW' | 'OUT_OF_STOCK';
    category_name: string | null;
    brand_name: string | null;
}

export interface InventoryTransaction {
    id: number;
    product_detail_id: number;
    product_name: string;
    sku: string;
    color_name: string | null;
    size_name: string | null;
    transaction_type: 'IMPORT' | 'EXPORT' | 'ADJUSTMENT' | 'RETURN';
    transaction_type_label: string;
    quantity: number;
    stock_before: number;
    stock_after: number;
    reference_type: string | null;
    reference_id: number | null;
    note: string | null;
    created_by: string;
    created_at: string;
}

export interface InventoryReportDetail {
    product_detail_id: number;
    product_id: number;
    product_name: string;
    sku: string;
    color_name: string | null;
    size_name: string | null;
    origin_name: string | null;
    price: number;
    opening_stock: number;
    total_import: number;
    total_export: number;
    total_adjustment: number;
    total_return: number;
    closing_stock: number;
    stock_value: number;
    stock_status: string;
}

export interface MonthlyReport {
    period: string;
    year: number;
    month: number;
    summary: {
        total_variants: number;
        total_stock_value: number;
        low_stock_count: number;
        out_of_stock_count: number;
    };
    movements: {
        total_import: number;
        total_export: number;
        total_adjustment: number;
        total_return: number;
    };
    details: InventoryReportDetail[];
}

export interface InventoryImportDTO {
    product_detail_id: number;
    quantity: number;
    note?: string;
}

export interface InventoryBatchImportDTO {
    items: InventoryImportDTO[];
    note?: string;
}

export interface InventoryAdjustDTO {
    product_detail_id: number;
    new_quantity: number;
    reason: string;
}

// =============== SERVICE ===============

@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    private apiUrl = `${environment.apiBaseUrl}/inventory`;

    constructor(private http: HttpClient) { }

    /**
     * Lấy danh sách tồn kho hiện tại
     */
    getStockList(params: {
        keyword?: string;
        stock_status?: string;
        category_id?: number;
        page?: number;
        size?: number;
    }): Observable<any> {
        let httpParams = new HttpParams();
        if (params.keyword) httpParams = httpParams.set('keyword', params.keyword);
        if (params.stock_status) httpParams = httpParams.set('stock_status', params.stock_status);
        if (params.category_id) httpParams = httpParams.set('category_id', params.category_id.toString());
        if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
        if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());

        return this.http.get<any>(`${this.apiUrl}/stock`, { params: httpParams });
    }

    /**
     * Nhập kho đơn lẻ
     */
    importStock(dto: InventoryImportDTO): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/import`, dto);
    }

    /**
     * Nhập kho hàng loạt
     */
    importStockBatch(dto: InventoryBatchImportDTO): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/import/batch`, dto);
    }

    /**
     * Điều chỉnh tồn kho
     */
    adjustStock(dto: InventoryAdjustDTO): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/adjust`, dto);
    }

    /**
     * Lấy lịch sử giao dịch của một biến thể
     */
    getTransactionHistory(productDetailId: number, page: number = 0, size: number = 20): Observable<any> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        return this.http.get<any>(`${this.apiUrl}/transactions/${productDetailId}`, { params });
    }

    /**
     * Lấy lịch sử giao dịch theo khoảng thời gian
     */
    getTransactionsByDateRange(productDetailId: number, startDate: string, endDate: string): Observable<any> {
        const params = new HttpParams()
            .set('start_date', startDate)
            .set('end_date', endDate);
        return this.http.get<any>(`${this.apiUrl}/transactions/${productDetailId}/range`, { params });
    }

    /**
     * Lấy báo cáo tồn kho theo tháng
     */
    getMonthlyReport(year: number, month: number): Observable<any> {
        const params = new HttpParams()
            .set('year', year.toString())
            .set('month', month.toString());
        return this.http.get<any>(`${this.apiUrl}/report/monthly`, { params });
    }
}
