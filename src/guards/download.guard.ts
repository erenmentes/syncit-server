import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DownloadGuard implements CanActivate {
    constructor(private prismaService: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();

        if (!request.user?.sub) {
            throw new UnauthorizedException("User not authenticated");
        }

        const fileId = Array.isArray(request.params.fileId)
            ? request.params.fileId[0]
            : request.params.fileId;

        if (!fileId) {
            throw new BadRequestException("fileId is required")
        }

        const file = await this.prismaService.file.findUnique({ where: { id: fileId } })

        if (!file) {
            throw new NotFoundException('File not found.')
        }

        const sharedFile = await this.prismaService.sharedFile.findFirst({
            where: {
                fileId,
                userId: request.user.sub
            }
        })

        if (file.authorId !== request.user.sub && !sharedFile) {
            throw new UnauthorizedException("You don't have permission.");
        }

        return true;
    }
}