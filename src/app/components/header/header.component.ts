import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { UserResponse } from '../../responses/user/user.response';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../base/base.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    NgbModule
  ]
})
export class HeaderComponent extends BaseComponent implements OnInit, OnDestroy {
  userResponse?: UserResponse | null;
  activeNavItem: number = 0;
  currentLang: string = 'vi';

  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);
  private userSubscription?: Subscription;

  constructor() {
    super();
  }

  ngOnInit() {
    // Lấy user ban đầu từ localStorage
    this.userResponse = this.userService.getUserResponseFromLocalStorage();

    // Subscribe để nhận real-time updates khi profile thay đổi
    this.userSubscription = this.userService.user$.subscribe(user => {
      // Cập nhật userResponse khi có thay đổi
      this.userResponse = user;
    });

    if (isPlatformBrowser(this.platformId)) {
      const savedLang = localStorage.getItem('lang') || 'vi';
      this.currentLang = savedLang;
      this.translate.use(savedLang);
    } else {
      this.translate.setDefaultLang('vi');
    }
  }

  ngOnDestroy() {
    // Unsubscribe khi component bị destroy
    this.userSubscription?.unsubscribe();
  }

  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lang', lang);
    }
  }

  handleItemClick(index: number): void {
    if (index === 0) {
      this.router.navigate(['/user-profile']);
    } else if (index === 2) {
      this.userService.removeUserFromLocalStorage();
      this.tokenService.removeToken();
      this.userResponse = null;
      this.router.navigate(['/login']);
    }
  }

  setActiveNavItem(index: number) {
    this.activeNavItem = index;
  }

  getAvatarUrl(user?: UserResponse | null): string {
    // Ưu tiên dùng ảnh profile_image từ server nếu có
    if (user?.profile_image) {
      return `${environment.apiBaseUrl}/users/profile-images/${user.profile_image}`;
    }
    // Fallback: Sử dụng UI Avatars API để tạo ảnh đại diện từ tên
    const name = encodeURIComponent(user?.fullname || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=000000&color=fff&size=128`;
  }
}
