export class FileUploadFinalizeDTO {
    fileId!: string;
    checksums!: Record<number, string>; 
    chunkSizes! : Record<number,number>;
}