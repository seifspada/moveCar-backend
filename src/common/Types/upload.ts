export type UploadedFileKV = {
  filename: string;
  mimetype: string;
  encoding: string;
  value: Buffer; // avec attachFieldsToBody:'keyValues'
};

export type UploadedFieldKV = { value: string };
