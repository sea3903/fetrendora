/**
 * Verify Email Component - Trendora Fashion
 * Xác thực email từ link gửi về Gmail
 */
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-verify-email',
    templateUrl: './verify-email.component.html',
    styleUrls: ['./verify-email.component.scss'],
    standalone: true,
    imports: [CommonModule, HeaderComponent, FooterComponent, TranslateModule]
})
export class VerifyEmailComponent implements OnInit {
    private platformId = inject(PLATFORM_ID);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private http = inject(HttpClient);
    private translate = inject(TranslateService);

    status: 'loading' | 'success' | 'error' = 'loading';
    message: string = '';
    currentLang: string = 'vi';

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            const savedLang = localStorage.getItem('lang') || 'vi';
            this.currentLang = savedLang;
            this.translate.use(savedLang);
        }
        this.translate.setDefaultLang('vi');

        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.route.queryParams.subscribe(params => {
            const token = params['token'];

            if (token) {
                this.verifyEmail(token);
            } else {
                this.status = 'error';
                this.message = this.translate.instant('VERIFY_EMAIL.ERROR');
            }
        });
    }

    switchLanguage(lang: string) {
        this.currentLang = lang;
        this.translate.use(lang);
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('lang', lang);
        }
    }

    verifyEmail(token: string) {
        this.http.get<any>(`${environment.apiBaseUrl}/users/verify?token=${token}`)
            .subscribe({
                next: (response) => {
                    this.status = 'success';
                    this.message = response.message || this.translate.instant('VERIFY_EMAIL.SUCCESS');
                },
                error: (error) => {
                    this.status = 'error';
                    this.message = error.error?.message || this.translate.instant('VERIFY_EMAIL.ERROR');
                }
            });
    }

    goToLogin() {
        this.router.navigate(['/login']);
    }
}
