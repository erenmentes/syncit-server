import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SignUpDTO } from './dto/sign-up.dto';
import { RefreshTokenPayload, UserService } from '../user/user.service';
import { SignInDTO } from './dto/sign-in.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
    constructor(private userService: UserService, private jwtService: JwtService) { }

    async signUp(signUpDto: SignUpDTO) {
        const { user, refreshToken } = await this.userService.createUser(signUpDto);
        const payload: JwtPayload = { sub: user.id, email: user.email };
        const access_token = await this.jwtService.signAsync(payload);
        return { access_token, refresh_token: refreshToken };
    }

    async signIn(signInDto: SignInDTO) {
        const isUserExists = await this.userService.checkIfUserExists(signInDto.email)

        if (!isUserExists) {
            throw new NotFoundException("Invalid credentials.")
        }

        const doesPasswordMatch = await this.userService.checkIfPasswordMatches(signInDto)

        if (!doesPasswordMatch) {
            throw new UnauthorizedException("Invalid credentials.")
        }

        const payload: JwtPayload = { sub: isUserExists.id, email: isUserExists.email }

        const access_token = await this.jwtService.signAsync(payload)
        const refresh_token = await this.userService.createRefreshToken(payload)

        return {
            access_token,
            refresh_token
        }
    }

    async refreshToken(refreshToken: string) {
        if (!refreshToken) {
            throw new UnauthorizedException('Missing refresh token');
        }

        const payload = await this.userService.checkIfRefreshTokenValid(refreshToken);

        const access_token = await this.jwtService.signAsync<JwtPayload>({
            sub: payload.sub,
            email: payload.email,
        });
        const refresh_token = await this.userService.createRefreshToken({
            sub: payload.sub,
            email: payload.email,
        } satisfies RefreshTokenPayload);

        return { access_token, refresh_token };
    }
}
