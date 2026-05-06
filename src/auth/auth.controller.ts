import { Body, Controller, Post, Req } from '@nestjs/common';
import { SignUpDTO } from './dto/sign-up.dto';
import { SignInDTO } from './dto/sign-in.dto';

@Controller('auth')
export class AuthController {

    @Post('signup')
    async signUp(@Req() req, @Body() signUpDto : SignUpDTO) {
        
    }

    @Post('signin')
    async signIn(@Req() req, @Body() signInDto : SignInDTO) {
        
    }
}
