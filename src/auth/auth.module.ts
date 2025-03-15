import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { jwtConstants } from './constants';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { UserModule } from '../user/user.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthController } from './auth.controller';
import { HypeAuthGuard } from './guard/hype-auth.guard';
import { HypeAnonymousAuthGuard } from './guard/hype-anonymous-auth.guard';
import { HypeAuthStrategy } from './strategies/hype-auth.strategy';
import { HypeAnonymousStrategy } from './strategies/hype-anonymous-auth.strategy';

@Module({
  imports: [
    UserModule,
    PassportModule,
    SequelizeModule.forFeature(),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    HypeAuthStrategy,
    HypeAnonymousStrategy,
    AuthService,
    JwtStrategy,
    LocalStrategy,
    HypeAuthGuard,
    HypeAnonymousAuthGuard,
  ],
  exports: [AuthService, HypeAuthGuard, HypeAnonymousAuthGuard],
})
export class AuthModule {}
