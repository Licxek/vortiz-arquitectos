import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface Proyecto {
  id: number;
  titulo: string;
  imagen_url: string;
}

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './proyectos.component.html',
})
export class ProyectosComponent implements OnInit {

  visible = false;

  proyectos: Proyecto[] = [
    { id: 1,  titulo: 'Ecocab',             imagen_url: 'assets/img/proyectos/ecocab.jpg' },
    { id: 2,  titulo: 'Puente Baluarte',    imagen_url: 'assets/img/proyectos/baluarte.jpg' },
    { id: 3,  titulo: 'Aeropuerto de Cancún', imagen_url: 'assets/img/proyectos/cancun.jpg' },
    { id: 4,  titulo: 'Toyota',             imagen_url: 'assets/img/proyectos/toyota.jpg' },
    { id: 5,  titulo: 'CA Automotive',      imagen_url: 'assets/img/proyectos/ca-automotive.jpg' },
    { id: 6,  titulo: 'Casas Geo',          imagen_url: 'assets/img/proyectos/casas-geo.jpg' },
    { id: 7,  titulo: 'COFICAB',            imagen_url: 'assets/img/proyectos/coficab.jpg' },
    { id: 8,  titulo: 'Paseo Durango',      imagen_url: 'assets/img/proyectos/paseo-durango.jpg' },
    { id: 9,  titulo: 'Fanosa',             imagen_url: 'assets/img/proyectos/fanosa.jpg' },
    { id: 10, titulo: 'Penal',              imagen_url: 'assets/img/proyectos/penal.jpg' },
    { id: 11, titulo: 'Bancomer',           imagen_url: 'assets/img/proyectos/bancomer.jpg' },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    setTimeout(() => (this.visible = true), 80);

    this.http.get<Proyecto[]>('/api/proyectos')
      .pipe(catchError(() => of([])))
      .subscribe(data => { if (data.length) this.proyectos = data; });
  }
}
