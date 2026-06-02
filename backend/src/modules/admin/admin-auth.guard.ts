import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { AdminRole } from '../../database/entities';
import { ADMIN_PUBLIC_KEY, ADMIN_ROLES_KEY } from './admin-auth.decorators';
import { AdminService } from './admin.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminService: AdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(ADMIN_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; method: string; originalUrl?: string; url?: string; admin?: unknown }>();
    const response = context.switchToHttp().getResponse<Response>();
    const admin = await this.adminService.currentAdmin(request.headers.cookie || '');
    if (!admin) {
      const next = encodeURIComponent(request.originalUrl || request.url || '/api/admin');
      response.redirect(`/api/admin/login?next=${next}`);
      return false;
    }

    request.admin = admin;
    const roles = this.reflector.getAllAndOverride<AdminRole[]>(ADMIN_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (roles?.length && !roles.includes(admin.role)) {
      response.status(403).type('html').send(this.adminService.renderForbidden(admin));
      return false;
    }
    return true;
  }
}
