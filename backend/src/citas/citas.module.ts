import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from './cita.entity';
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cita])],
  controllers: [CitasController],
  providers: [CitasService],
})
export class CitasModule {}