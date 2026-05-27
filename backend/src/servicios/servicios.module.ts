import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Servicio } from './servicio.entity';
import { ServiciosService } from './servicios.service';
import { ServiciosController } from './servicios.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Servicio])],
  controllers: [ServiciosController],
  providers: [ServiciosService],
})
export class ServiciosModule {}