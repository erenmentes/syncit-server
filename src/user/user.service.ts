import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SignUpDTO } from '../auth/dto/sign-up.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SignInDTO } from '../auth/dto/sign-in.dto';
import * as bcrypt from "bcrypt";
import { JwtService } from '@nestjs/jwt';

const saltRounds = 10;

export type RefreshTokenPayload = {
    sub: number;
    email: string;
};

export type CreateUserResult = {
    user: { id: number; email: string };
    refreshToken: string;
};

@Injectable()
export class UserService {
    constructor(
        private prismaService: PrismaService,
        private jwtService: JwtService
    ) { }

    // ------------------------
    // CREATE USER
    // ------------------------
    async createUser(signUpDto: SignUpDTO): Promise<CreateUserResult> {
        const userExists = await this.checkIfUserExists(signUpDto.email);

        if (userExists) {
            throw new ConflictException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(signUpDto.password, saltRounds);

        const user = await this.prismaService.user.create({
            data: {
                email: signUpDto.email,
                password: hashedPassword,
            }
        });

        const refreshToken = await this.jwtService.signAsync(
            { sub: user.id, email: user.email },
            {
                secret: process.env.REFRESH_TOKEN_SECRET,
                expiresIn: '7d',
            }
        );

        return {
            user: { id: user.id, email: user.email },
            refreshToken,
        };
    }

    // ------------------------
    // USER EXISTS
    // ------------------------
    async checkIfUserExists(email: string) {
        const user = await this.prismaService.user.findUnique({
            where: { email }
        });

        if (!user) {
            return false;
        }

        return user;
    }

    // ------------------------
    // PASSWORD CHECK
    // ------------------------
    async checkIfPasswordMatches(signInDto: SignInDTO) {
        const user = await this.prismaService.user.findUnique({
            where: { email: signInDto.email }
        });

        if (!user) return false;

        return bcrypt.compare(signInDto.password, user.password);
    }

    // ------------------------
    // CREATE REFRESH TOKEN
    // ------------------------
    async createRefreshToken(payload: RefreshTokenPayload) {
        return this.jwtService.signAsync(
            { sub: payload.sub, email: payload.email },
            {
                secret: process.env.REFRESH_TOKEN_SECRET,
                expiresIn: '7d',
            }
        );
    }

    // ------------------------
    // VERIFY REFRESH TOKEN
    // ------------------------
    async checkIfRefreshTokenValid(refreshToken: string) {
        try {
            const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
                secret: process.env.REFRESH_TOKEN_SECRET,
            });

            return payload;
        } catch (err) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
}
