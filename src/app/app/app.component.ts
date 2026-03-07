import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LOCALE_ID } from '@angular/core';
import localeVi from '@angular/common/locales/vi';
import { registerLocaleData, CommonModule } from '@angular/common';
import { ChatbotComponent } from '../components/chatbot/chatbot.component';
import { Router } from '@angular/router';

// Đăng ký locale tiếng Việt
registerLocaleData(localeVi, 'vi');

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [
        CommonModule,
        RouterModule,
        ChatbotComponent,
    ],
    providers: [
        { provide: LOCALE_ID, useValue: 'vi' }, // Đặt locale mặc định là 'vi'
    ],
})
export class AppComponent {
    isAdminRoute = false;

    constructor(private router: Router) {
        this.router.events.subscribe(() => {
            this.isAdminRoute = this.router.url.startsWith('/admin');
        });
    }
}
