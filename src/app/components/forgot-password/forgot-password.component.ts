import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-forgot-password',
  template: `
    <app-header></app-header>
    <div class="d-flex align-items-center justify-content-center min-vh-100 bg-light py-5 font-inter">
      <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-5">
                <div class="card border-0 shadow p-4 p-md-5 text-center">
                    
                    <ng-container *ngIf="!emailSent">
                        <h3 class="fw-bold text-uppercase mb-3 ls-1">{{ 'FORGOT_PASSWORD.TITLE' | translate }}</h3>
                        <p class="text-muted mb-4">{{ 'FORGOT_PASSWORD.DESC' | translate }}</p>
                        
                        <form (ngSubmit)="onSubmit()">
                            <div class="mb-4">
                                <input type="email" class="form-control form-control-lg text-center" 
                                       [(ngModel)]="email" name="email" 
                                       [placeholder]="'LOGIN.EMAIL_PLACEHOLDER' | translate" 
                                       required email>
                            </div>
                            
                            <button type="submit" class="btn btn-dark w-100 py-3 fw-bold text-uppercase ls-1" 
                                    [disabled]="loading || !email">
                                <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
                                {{ loading ? ('COMMON.LOADING' | translate) : ('FORGOT_PASSWORD.SEND_BTN' | translate) }}
                            </button>
                        </form>
                        
                        <div class="mt-4">
                            <a routerLink="/login" class="text-decoration-none text-muted small fw-bold">
                                <i class="fas fa-arrow-left me-1"></i> {{ 'NAV.LOGIN' | translate }}
                            </a>
                        </div>
                    </ng-container>
                    
                    <ng-container *ngIf="emailSent">
                        <div class="text-success mb-4">
                             <i class="fas fa-envelope-open-text fa-4x"></i>
                        </div>
                        <h4 class="fw-bold mb-3">{{ 'FORGOT_PASSWORD.CHECK_MAIL' | translate }}</h4>
                        <p class="text-muted mb-4">
                            {{ 'FORGOT_PASSWORD.SENT_DESC' | translate }} <br>
                            <strong class="text-dark">{{ email }}</strong>
                        </p>
                        <a routerLink="/login" class="btn btn-outline-dark w-100 py-2 fw-bold text-uppercase">
                             {{ 'VERIFY_EMAIL.LOGIN_BUTTON' | translate }}
                        </a>
                    </ng-container>

                </div>
            </div>
        </div>
      </div>
    </div>
    <app-footer></app-footer>
  `,
  styles: [`
    .font-inter { font-family: 'Inter', sans-serif; }
    .ls-1 { letter-spacing: 1px; }
    .form-control:focus { border-color: #000; box-shadow: 0 0 0 0.2rem rgba(0,0,0,0.05); }
    .min-vh-100 { min-height: 80vh !important; } /* Adjust to account for header/footer */
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent, TranslateModule, RouterModule]
})
export class ForgotPasswordComponent {
  email: string = '';
  loading: boolean = false;
  emailSent: boolean = false;

  private userService = inject(UserService);
  private toastService = inject(ToastService);

  onSubmit() {
    if (!this.email) return;
    this.loading = true;

    this.userService.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.emailSent = true;
      },
      error: (err: any) => {
        this.loading = false;
        this.toastService.showToast({
          defaultMsg: 'Failed to send email',
          error: err
        });
      }
    });
  }
}
