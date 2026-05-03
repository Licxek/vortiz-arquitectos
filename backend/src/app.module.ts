import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CitasModule } from './citas/citas.module';
import { ServiciosModule } from './servicios/servicios.module';
import { PagesModule } from './pages/pages.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ServicesModule } from './services/services.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [AuthModule, CitasModule, ServiciosModule, PagesModule, DashboardModule, ServicesModule, DashboardsModule, ProfileModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
