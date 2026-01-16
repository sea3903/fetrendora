import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent, RouterModule],
    template: `
    <app-header></app-header>
    <div class="d-flex align-items-center justify-content-center min-vh-100 bg-light py-5 font-inter">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-md-6 col-lg-5">
                    <div class="card border-0 shadow p-4 p-md-5">
                        <h3 class="fw-bold text-center text-uppercase mb-4">Đặt lại mật khẩu</h3>
                        
                        <form (ngSubmit)="onSubmit()" #resetForm="ngForm">
                            <div class="mb-3">
                                <label class="form-label fw-bold small">Mật khẩu mới</label>
                                <input type="password" class="form-control form-control-lg" 
                                       [(ngModel)]="password" name="password" required minlength="6">
                            </div>
                            <div class="mb-4">
                                <label class="form-label fw-bold small">Xác nhận mật khẩu</label>
                                <input type="password" class="form-control form-control-lg" 
                                       [(ngModel)]="confirmPassword" name="confirmPassword" required>
                                <div *ngIf="password && confirmPassword && password !== confirmPassword" class="text-danger small mt-1">
                                    Mật khẩu không khớp
                                </div>
                            </div>
                            
                            <button type="submit" class="btn btn-dark w-100 py-3 fw-bold text-uppercase" 
                                    [disabled]="loading || resetForm.invalid || password !== confirmPassword">
                                <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
                                Lưu mật khẩu
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <app-footer></app-footer>
  `,
    styles: [`
    .font-inter { font-family: 'Inter', sans-serif; }
    .form-control:focus { border-color: #000; box-shadow: 0 0 0 0.2rem rgba(0,0,0,0.05); }
    .min-vh-100 { min-height: 80vh !important; }
  `]
})
export class ResetPasswordComponent implements OnInit {
    token: string = '';
    password: string = '';
    confirmPassword: string = '';
    loading: boolean = false;

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private userService = inject(UserService);
    private toastService = inject(ToastService);

    ngOnInit() {
        this.token = this.route.snapshot.queryParams['token'];
        if (!this.token) {
            // Check if token in route param? No, email link generated as query param
        }
    }

    onSubmit() {
        if (!this.password || this.password !== this.confirmPassword) return;
        this.loading = true;

        this.userService.resetPasswordWithToken(this.token, this.password).subscribe({
            next: (res) => {
                this.loading = false;
                this.toastService.showToast({ defaultMsg: 'Mật khẩu đã được thay đổi thành công' });
                this.router.navigate(['/login']);
            },
            error: (err) => {
                this.loading = false;
                this.toastService.showToast({ defaultMsg: 'Đổi mật khẩu thất bại', error: err });
            }
        });
    }
}
