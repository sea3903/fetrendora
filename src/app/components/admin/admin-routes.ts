import { AdminComponent } from "./admin.component";
import { OrderAdminComponent } from "./order/order.admin.component";
import { DetailOrderAdminComponent } from "./detail-order/detail.order.admin.component";
import { Routes } from "@angular/router";
import { ProductAdminComponent } from "./product/product.admin.component";
import { CategoryAdminComponent } from "./category/category.admin.component";
import { UpdateProductAdminComponent } from "./product/update/update.product.admin.component";
import { InsertProductAdminComponent } from "./product/insert/insert.product.admin.component";
import { UserAdminComponent } from "./user/user.admin.component";
// Admin Profile & Change Password Components
import { AdminProfileComponent } from "./profile/admin-profile.component";
import { AdminChangePasswordComponent } from "./change-password/admin-change-password.component";
// Brand Component
import { BrandAdminComponent } from "./brand/brand.admin.component";
// Lookup Tables: Color, Origin, Size
import { ColorAdminComponent } from "./color/color.admin.component";
import { OriginAdminComponent } from "./origin/origin.admin.component";
import { SizeAdminComponent } from "./size/size.admin.component";
import { CouponComponent } from "./coupon/coupon.component";
// Inventory Management
import { InventoryAdminComponent } from "./inventory/inventory.admin.component";
// Event Management
import { EventAdminComponent } from "./event/event.admin.component";

export const adminRoutes: Routes = [
    {
        path: 'admin',
        component: AdminComponent,
        children: [
            {
                path: 'orders',
                component: OrderAdminComponent
            },
            {
                path: 'products',
                component: ProductAdminComponent
            },
            {
                path: 'categories',
                component: CategoryAdminComponent
            },
            {
                path: 'brands',
                component: BrandAdminComponent
            },
            // Product sub paths
            {
                path: 'orders/:id',
                component: DetailOrderAdminComponent
            },
            {
                path: 'products/update/:id',
                component: UpdateProductAdminComponent
            },
            {
                path: 'products/insert',
                component: InsertProductAdminComponent
            },
            {
                path: 'users',
                component: UserAdminComponent
            },
            // ═══════════════════════════════════════════════════════════════
            // ADMIN PROFILE & CHANGE PASSWORD
            // ═══════════════════════════════════════════════════════════════
            {
                path: 'profile',
                component: AdminProfileComponent
            },
            {
                path: 'change-password',
                component: AdminChangePasswordComponent
            },
            // ═══════════════════════════════════════════════════════════════
            // LOOKUP TABLES: COLORS, ORIGINS, SIZES
            // ═══════════════════════════════════════════════════════════════
            {
                path: 'colors',
                component: ColorAdminComponent
            },
            {
                path: 'origins',
                component: OriginAdminComponent
            },
            {
                path: 'sizes',
                component: SizeAdminComponent
            },

            // ═══════════════════════════════════════════════════════════════
            // COUPON MANAGEMENT
            // ═══════════════════════════════════════════════════════════════
            {
                path: 'coupons',
                component: CouponComponent
            },

            // ═══════════════════════════════════════════════════════════════
            // INVENTORY MANAGEMENT
            // ═══════════════════════════════════════════════════════════════
            {
                path: 'inventory',
                component: InventoryAdminComponent
            },

            // ═══════════════════════════════════════════════════════════════
            // EVENT MANAGEMENT
            // ═══════════════════════════════════════════════════════════════
            {
                path: 'events',
                component: EventAdminComponent
            }
        ]
    }
];
