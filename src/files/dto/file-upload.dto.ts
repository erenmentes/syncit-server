export class FileUploadDTO {
    fileName! : string;
    fileSize! : number;
    clientLastModified! : bigint;
    fileRelativePath! : string;
    chunks! : Array<number>;
    chunkHashes! : Array<string>;
}