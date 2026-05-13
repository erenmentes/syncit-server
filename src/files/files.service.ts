import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { FileUploadDTO } from './dto/file-upload.dto';
import { PrismaService } from '../prisma/prisma.service';
import { s3Client } from '../aws/s3Client';
import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileUploadFinalizeDTO } from './dto/file-upload-finalize.dto';

@Injectable()
export class FilesService {

    constructor(private prismaService: PrismaService) { }

    async uploadFileInitialize(userId: any, fileUploadDto: FileUploadDTO): Promise<Record<string, Record<number, string>>> {
        const fileCreated = await this.prismaService.file.create(
            {
                data: {
                    name: fileUploadDto.fileName,
                    size: fileUploadDto.fileSize,
                    relativePath: fileUploadDto.fileRelativePath,
                    status: 'PENDING',
                    clientLastModified: fileUploadDto.clientLastModified,
                    author: {
                        connect: { id: userId }
                    }
                }
            }
        )

        let chunkPresignedUrls = {}

        for (let i = 0; i < fileUploadDto.chunks.length; i++) {
            const chunkIndex = i
            const chunkHash = fileUploadDto.chunkHashes[i]

            const doesChunkExist = await this.prismaService.chunk.findUnique({ where: { hash: chunkHash } })

            if (!doesChunkExist) {
                const putObjectCommand = new PutObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: `${fileCreated.id}/chunk-${chunkIndex}`,
                });
                const url = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 3600 })
                chunkPresignedUrls[i] = url

                await this.prismaService.file.update({ where: { id: fileCreated.id }, data: { lastActivityAt: new Date() } })

            } else {
                await this.prismaService.chunk.update({ where: { hash: chunkHash }, data: { refCount: { increment: 1 } } })
                await this.prismaService.fileChunk.create({
                    data: {
                        file: {
                            connect: {
                                id: fileCreated.id
                            }
                        },
                        chunk: {
                            connect: {
                                hash: chunkHash
                            }
                        },
                        chunkIndex
                    }
                })

                await this.prismaService.file.update({
                    where: { id: fileCreated.id },
                    data: {
                        lastUploadedChunk: chunkIndex,
                        lastActivityAt: new Date()
                    }
                });
                chunkPresignedUrls[i] = null;
            }
        }

        return {
            fileId: fileCreated.id,
            presignedUrlList: chunkPresignedUrls
        }
    }

    async uploadFileFinalize(userId: any, fileUploadFinalizeDto: FileUploadFinalizeDTO) {
        const doesFileExist = await this.prismaService.file.findUnique({ where: { id: fileUploadFinalizeDto.fileId } })

        if (!doesFileExist) {
            throw new NotFoundException('File not found.')
        }

        if (doesFileExist.authorId != userId) {
            throw new UnauthorizedException('You dont have permission for that action.')
        }

        const chunkList = fileUploadFinalizeDto.checksums
        const bucketName = process.env.AWS_BUCKET_NAME;

        let totalUploadedSize = 0;
        let highestContiguousUploadedChunk = -1;
        let isContiguous = true;

        for (const [chunkIndexStr, chunkHash] of Object.entries(chunkList)) {
            const chunkIndex = parseInt(chunkIndexStr);
            const objectKey = `${fileUploadFinalizeDto.fileId}/chunk-${chunkIndex}`;

            const s3Uri = `s3://${bucketName}/${objectKey}`;

            try {
                const headCommand = new HeadObjectCommand({
                    Bucket: bucketName,
                    Key: objectKey,
                });
                const s3Response = await s3Client.send(headCommand);

                const clientSize = Number(fileUploadFinalizeDto.chunkSizes[chunkIndex]);

                if (s3Response.ContentLength !== clientSize) {
                    throw new BadRequestException(`Chunk size mismatch at index ${chunkIndex}.`);
                }

                totalUploadedSize += s3Response.ContentLength;

            } catch (error: any) {
                if (error instanceof BadRequestException) {
                    throw error;
                }
                if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
                    throw new NotFoundException(`Chunk on index ${chunkIndexStr} with ${chunkHash} hash not found in S3.`);
                }
                if (error.name === "Forbidden" || error.$metadata?.httpStatusCode === 403) {
                    throw new UnauthorizedException('Missing permissions or object does not exist');
                }
                throw error;
            }

            const chunkSize = fileUploadFinalizeDto.chunkSizes[chunkIndex] ?? fileUploadFinalizeDto.chunkSizes[chunkIndexStr];

            await this.prismaService.chunk.upsert({
                where: { hash: chunkHash },
                update: { refCount: { increment: 1 } },
                create: {
                    hash: chunkHash,
                    s3Path: s3Uri,
                    size: chunkSize
                }
            });

            await this.prismaService.fileChunk.upsert({
                where: {
                    fileId_chunkHash: {
                        fileId: fileUploadFinalizeDto.fileId,
                        chunkHash: chunkHash
                    }
                },
                update: {},
                create: {
                    fileId: fileUploadFinalizeDto.fileId,
                    chunkHash: chunkHash,
                    chunkIndex: chunkIndex
                }
            });

            if (isContiguous && chunkIndex === highestContiguousUploadedChunk + 1) {
                highestContiguousUploadedChunk = chunkIndex;
            } else {
                isContiguous = false;
            }
        }

        if (totalUploadedSize !== Number(doesFileExist.size)) {
            throw new BadRequestException('Total uploaded chunks size does not match the initialized file size.');
        }

        await this.prismaService.file.update({
            where: { id: fileUploadFinalizeDto.fileId },
            data: {
                status: 'COMPLETED',
                lastUploadedChunk: highestContiguousUploadedChunk,
                lastActivityAt: new Date()
            }
        });

        return { success: true, message: 'File finalized and verified successfully.' };
    }

}
