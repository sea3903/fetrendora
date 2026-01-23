/**
 * HEADER COMPONENT - Pattern giống Admin
 * Sử dụng *ngIf + [class.show] cho dropdown
 */
import { Component, OnInit, OnDestroy, inject, PLATFORM_ID, HostListener } from '@angular/core';
import { UserResponse } from '../../responses/user/user.response';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../base/base.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';
import { Category } from '../../models/category';
import { ApiResponse } from '../../responses/api.response';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule
  ]
})
export class HeaderComponent extends BaseComponent implements OnInit, OnDestroy {
  userResponse?: UserResponse | null;
  currentLang: string = 'vi';

  // Danh mục dạng cây
  categoryTree: Category[] = [];
  // Danh mục đang hover/mở
  activeParentId?: number;
  // User menu dropdown
  showUserMenu: boolean = false;

  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);
  private userSubscription?: Subscription;

  constructor() {
    super();
  }

  // Close dropdown when clicking outside (giống Admin)
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown')) {
      this.showUserMenu = false;
    }
  }

  ngOnInit() {
    // Lấy user ban đầu từ localStorage
    this.userResponse = this.userService.getUserResponseFromLocalStorage();
    console.log('Header: Init User:', this.userResponse);

    // Subscribe để nhận real-time updates (giống Admin)
    this.userSubscription = this.userService.user$.subscribe(user => {
      if (user) {
        this.userResponse = user;
        console.log('Header: User Updated:', user);
      }
    });

    // Lấy language từ localStorage
    if (isPlatformBrowser(this.platformId)) {
      const savedLang = localStorage.getItem('lang') || 'vi';
      this.currentLang = savedLang;
      this.translate.use(savedLang);
    } else {
      this.translate.setDefaultLang('vi');
    }

    // Tải danh mục dạng cây
    this.loadCategoryTree();
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }

  // Tải danh mục dạng cây từ API
  loadCategoryTree() {
    this.categoryService.getCategoryTree().subscribe({
      next: (response: ApiResponse) => {
        this.categoryTree = response.data || [];
      },
      error: () => {
        // Fallback: nếu không có API tree, dùng flat list
        this.categoryService.getCategories().subscribe({
          next: (res: ApiResponse) => {
            this.categoryTree = this.buildTree(res.data || []);
          }
        });
      }
    });
  }

  // Xây dựng cây danh mục từ flat list
  buildTree(categories: Category[]): Category[] {
    const map = new Map<number, Category>();
    const roots: Category[] = [];

    categories.forEach(cat => {
      map.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach(cat => {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  // Mở/đóng dropdown danh mục con
  toggleCategory(categoryId: number) {
    if (this.activeParentId === categoryId) {
      this.activeParentId = undefined;
    } else {
      this.activeParentId = categoryId;
    }
  }

  // Chuyển ngôn ngữ
  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lang', lang);
    }
  }

  // Toggle user dropdown (giống Admin)
  toggleUserMenu(): void {
    console.log('Header: Toggle dropdown. Before:', this.showUserMenu);
    this.showUserMenu = !this.showUserMenu;
    console.log('Header: Toggle dropdown. After:', this.showUserMenu);
  }

  // Close dropdown (giống Admin)
  closeDropdown(): void {
    this.showUserMenu = false;
  }

  // Điều hướng đến danh mục
  navigateToCategory(category: Category) {
    this.router.navigate(['/home'], {
      queryParams: { categoryId: category.id }
    });
    this.activeParentId = undefined;
  }

  // Logout (giống Admin)
  logout(): void {
    this.showUserMenu = false;
    this.userService.removeUserFromLocalStorage();
    this.tokenService.removeToken();
    this.userResponse = null;
    this.router.navigate(['/login']);
  }

  // Lấy URL avatar
  getAvatarUrl(user?: UserResponse | null): string {
    if (user?.profile_image && user.profile_image.trim() !== '') {
      if (user.profile_image.startsWith('http')) {
        return user.profile_image;
      }
      return `${environment.apiBaseUrl}/users/profile-images/${user.profile_image}`;
    }
    const name = encodeURIComponent(user?.fullname || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=000000&color=fff&size=128`;
  }

  // Handle image error (thêm mới giống Admin)
  onImageError(event: any): void {
    event.target.src = 'https://ui-avatars.com/api/?name=User&background=000000&color=fff&size=128';
  }

  // Lấy số lượng giỏ hàng
  getCartItemCount(): number {
    return this.cartService.getCart().size;
  }
}
