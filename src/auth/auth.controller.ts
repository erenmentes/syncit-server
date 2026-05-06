import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { SignUpDTO } from './dto/sign-up.dto';
import { SignInDTO } from './dto/sign-in.dto';
import { AuthService } from './auth.service';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private authService : AuthService) {}

    @Post('signup')
    async signUp(@Body() signUpDto : SignUpDTO, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.signUp(signUpDto);

        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('refresh_token', result.refresh_token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            path: '/auth/refresh_token',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return { access_token: result.access_token };
    }

    @Post('signin')
    async signIn(@Body() signInDto : SignInDTO, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.signIn(signInDto);

        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('refresh_token', result.refresh_token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            path: '/auth/refresh_token',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return { access_token: result.access_token };
    }

    @Post('refresh_token')
    async refreshToken(@Req() req, @Res({ passthrough: true }) res: Response) {
        const token = req.cookies?.['refresh_token'];
        const result = await this.authService.refreshToken(token);

        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('refresh_token', result.refresh_token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            path: '/auth/refresh_token',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return { access_token: result.access_token };
    }
}
