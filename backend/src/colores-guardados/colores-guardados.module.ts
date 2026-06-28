import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColorGuardado } from './colores-guardados.entity';
import { ColoresGuardadosService } from './colores-guardados.service';
import { ColoresGuardadosController } from './colores-guardados.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ColorGuardado])],
  providers: [ColoresGuardadosService],
  controllers: [ColoresGuardadosController],
  exports: [ColoresGuardadosService],
})
export class ColoresGuardadosModule {}