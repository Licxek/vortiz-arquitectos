import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { filter } from 'rxjs';
import { ThemeService } from './core/services/theme.service'; // ajusta ruta
import { Title, Meta } from '@angular/platform-browser';
import { ConfiguracionService } from './core/services/configuracion.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  esRutaAdmin = false;

  constructor(private router: Router, private theme: ThemeService, private config: ConfiguracionService,
    private title: Title,
    private meta: Meta) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.esRutaAdmin = event.url.startsWith('/admin');
    });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyA') {
      event.preventDefault();
      this.router.navigate(['/admin/login']);
    }
  }

  ngOnInit() { this.theme.aplicar();
    // SEO en vivo
    this.config.configPublica$.subscribe(c => {
      if (!c) return;
      this.title.setTitle(c.meta_title);
      this.meta.updateTag({ name: 'description', content: c.meta_description });
      this.meta.updateTag({ name: 'keywords', content: c.meta_keywords });
    });

    this.config.cargarPublica(); // primera carga (dispara todo)
  }
}
