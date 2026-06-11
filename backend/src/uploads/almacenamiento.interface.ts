/** Resultado de una subida exitosa */
export interface ResultadoUpload {
  /** URL pública del archivo (lo que guardas en BD) */
  url: string;
  /** ID interno del archivo (para borrarlo despues) */
  publicId: string;
}

/** Contrato que cualquier proveedor de almacenamiento debe cumplir */
export interface IAlmacenamiento {
  subir(file: Express.Multer.File, carpeta: string): Promise<ResultadoUpload>;
  eliminar(publicId: string): Promise<void>;
}

/** Token de inyección para Nest */
export const ALMACENAMIENTO_TOKEN = Symbol('ALMACENAMIENTO');