import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';
import { Strategy } from 'passport-custom';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class HypeAnonymousStrategy extends PassportStrategy(
  Strategy,
  'hype-anonymous',
) {
  constructor(
    private userService: UserService,
    private authService: AuthService,
    private jwtService: JwtService,
  ) {
    super();
  }

  async validate(req: Request) {
    const headers = req.headers;
    const apiKey = headers['hype-api-key'];
    const authorization = headers['authorization'];

    if (apiKey != null) {
      await this.authService.validateApiKey(headers);
      return true;
    }
    if (authorization != null) {
      const token = req.headers['authorization'].split(' ')[1];

      let user = null;
      try {
        const result = await this.jwtService.verify(token);
        user = await this.userService.findOne({
          id: result.sub,
        });
      } catch (e) {}

      if (user == null) {
        throw new UnauthorizedException();
      }
      return user;
    } else {
      return null;
    }
  }
}
