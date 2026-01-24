export type FastifyFileKV = {
  filename: string;
  mimetype: string;
  encoding: string;
  value: Buffer;
};

export type DemandeFiles = {
  carteIdentite?: FastifyFileKV[]; // 2
  permisRectoVerso?: FastifyFileKV[]; // 2
  kbis?: FastifyFileKV[]; // 1
  rib?: FastifyFileKV[]; // 1
  assuranceRcPro?: FastifyFileKV[]; // 1
  assuranceRcCirculation?: FastifyFileKV[]; // 1
  casierJudiciaire?: FastifyFileKV[]; // 1
  carteGrisWgarage?: FastifyFileKV[]; // 1
};
