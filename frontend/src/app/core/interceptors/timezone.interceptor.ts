import { HttpInterceptorFn } from '@angular/common/http';

export const timezoneInterceptor: HttpInterceptorFn = (req, next) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cloned = req.clone({
    setHeaders: { 'X-Timezone': timezone },
  });
  return next(cloned);
};
