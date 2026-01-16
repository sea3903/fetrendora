import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { UserResponse } from '../../responses/user/user.response';
import { RouterModule } from "@angular/router";
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../base/base.component';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
  ]
})
export class AdminComponent extends BaseComponent implements OnInit, OnDestroy {
  userResponse?: UserResponse | null;
  dropdownOpen: boolean = false;
  langDropdownOpen: boolean = false;
  currentLang: string = 'vi';

  private userSubscription?: Subscription;
  private translate = inject(TranslateService);

  constructor() {
    super();
    this.currentLang = this.translate.currentLang || localStorage.getItem('lang') || 'vi';
  }

  ngOnInit() {
    // Lấy user ban đầu từ localStorage
    this.userResponse = this.userService.getUserResponseFromLocalStorage();

    // Subscribe để nhận real-time updates
    this.userSubscription = this.userService.user$.subscribe(user => {
      if (user) {
        this.userResponse = user;
      }
    });

    // Default router
    if (this.router.url === '/admin') {
      this.router.navigate(['/admin/orders']);
    }
  }

  ngOnDestroy() {
    // Unsubscribe khi component bị destroy
    this.userSubscription?.unsubscribe();
  }

  // Toggle dropdown menu
  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    this.langDropdownOpen = false;
  }

  closeDropdown() {
    this.dropdownOpen = false;
  }

  // Language dropdown
  toggleLangDropdown() {
    this.langDropdownOpen = !this.langDropdownOpen;
    this.dropdownOpen = false;
  }

  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
    this.langDropdownOpen = false;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown')) {
      this.dropdownOpen = false;
    }
    if (!target.closest('.lang-switcher')) {
      this.langDropdownOpen = false;
    }
  }

  // Get avatar URL
  getAvatarUrl(): string {
    if (this.userResponse?.profile_image) {
      return `${environment.apiBaseUrl}/users/profile-images/${this.userResponse.profile_image}`;
    }
    return 'assets/images/user-placeholder.png';
  }

  // Handle image error
  onImageError(event: any) {
    event.target.src = 'assets/images/user-placeholder.png';
  }

  logout() {
    this.userService.removeUserFromLocalStorage();
    this.tokenService.removeToken();
    this.userResponse = null;
    this.router.navigate(['/']);
  }

  showAdminComponent(componentName: string): void {
    this.router.navigate([`/admin/${componentName}`]);
  }
}