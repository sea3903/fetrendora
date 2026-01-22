import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { UserResponse } from '../../responses/user/user.response';
import { RouterModule } from "@angular/router";
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../base/base.component';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
  ]
})
export class AdminComponent extends BaseComponent implements OnInit, OnDestroy {
  userResponse?: UserResponse | null;
  dropdownOpen: boolean = false;

  private userSubscription?: Subscription;

  constructor() {
    super();
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
  }

  closeDropdown() {
    this.dropdownOpen = false;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown')) {
      this.dropdownOpen = false;
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