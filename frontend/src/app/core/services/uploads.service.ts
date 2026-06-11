import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ResultadoUpload {
  url: string;
  publicId: string;
}

@Injectable({ providedIn: 'root' })
export class UploadsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/uploads`;

  /** Sube una imagen al backend y devuelve { url, publicId } */
  subirImagen(archivo: File, carpeta: string = 'general'): Observable<ResultadoUpload> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('carpeta', carpeta);
    return this.http.post<ResultadoUpload>(`${this.base}/imagen`, formData);
  }

  /** Elimina una imagen previa por su publicId */
  eliminarImagen(publicId: string): Observable<any> {
    return this.http.request('DELETE', `${this.base}/imagen`, {
      body: { publicId },
    });
  }
}
