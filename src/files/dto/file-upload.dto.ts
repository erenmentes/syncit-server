export class FileUploadDTO {
    fileId! : string;
    fileName! : string;
    fileSize! : number;
    clientLastModified! : bigint;
    fileRelativePath! : string;
    chunks! : Array<number>;
    chunkHashes! : Array<string>;
    chunkSizes! : Array<number>;
}