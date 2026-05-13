import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { FileUploadDTO } from './dto/file-upload.dto';
import { FilesService } from './files.service';
import { GetUser } from '../decorators/user.decorator';
import { FileUploadFinalizeDTO } from './dto/file-upload-finalize.dto';

@Controller('files')
export class FilesController {

    constructor(private prismaService : PrismaService, private filesService : FilesService) {}

    @UseGuards(AuthGuard)
    @Post('upload/init')
    async uploadFileInit(@GetUser() userId, @Body() fileUploadDto : FileUploadDTO) {
        return await this.filesService.uploadFileInitialize(userId,fileUploadDto)
    }
    
    @UseGuards(AuthGuard)
    @Post('upload/finalize')
    async uploadFileFinalize(@GetUser() userId, @Body() fileUploadFinalizeDto : FileUploadFinalizeDTO) {
        return await this.filesService.uploadFileFinalize(userId,fileUploadFinalizeDto)
    }

    @UseGuards(AuthGuard)
    @Post('resume')
    async resumeFileUpload() {

    }

    @UseGuards(AuthGuard)
    @Get('download')
    async downloadFile() {

    }

    @UseGuards(AuthGuard)
    @Delete('delete')
    async deleteFile() {

    }
}
