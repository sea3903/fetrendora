import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../responses/api.response';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private apiUrl = `${environment.apiBaseUrl}/dashboard`;

    constructor(private http: HttpClient) { }

    /**
     * Lấy toàn bộ dữ liệu dashboard
     */
    getDashboardData(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(this.apiUrl);
    }
}
