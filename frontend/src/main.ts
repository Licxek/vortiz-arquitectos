// ⚠️ DEBUG TEMPORAL — Detector de removeItem
(function() {
  const _r = localStorage.removeItem.bind(localStorage);
  const _s = localStorage.setItem.bind(localStorage);
  const _g = localStorage.getItem.bind(localStorage);

  localStorage.removeItem = function(k: string) {
    if (k && k.startsWith('vortiz')) {
      console.warn('🗑️ REMOVE:', k);
      console.trace();
    }
    return _r(k);
  };
  localStorage.setItem = function(k: string, v: string) {
    if (k && k.startsWith('vortiz')) {
      console.log('💾 SET:', k, '=', String(v).substring(0, 60));
    }
    return _s(k, v);
  };
  localStorage.getItem = function(k: string) {
    const v = _g(k);
    if (k && k.startsWith('vortiz')) {
      console.log('📖 GET:', k, '→', v ? 'existe' : 'NULL');
    }
    return v;
  };
  console.log('%c✅ DETECTOR INSTALADO', 'background: green; color: white; padding: 4px 8px; font-weight: bold');
})();
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
