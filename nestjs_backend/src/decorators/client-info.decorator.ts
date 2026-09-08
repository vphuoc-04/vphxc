import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestHelper } from '../helpers/request.helper';
import {
  UserAgentHelper,
  DeviceInfo as IDeviceInfo,
} from '../helpers/user-agent.helper';

/**
 * Custom Param Decorator lấy IP chính xác của Client
 */
export const IPAddress = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return RequestHelper.getIPAddress(req);
  },
);

/**
 * Alias cho IPAddress
 */
export const IpAddress = IPAddress;
export const ClientIp = IPAddress;

/**
 * Custom Param Decorator lấy ID của người dùng hiện tại (kiểu number | null)
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | null => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return RequestHelper.getUserId(req);
  },
);

/**
 * Alias cho CurrentUserId
 */
export const CurrentUser = CurrentUserId;

/**
 * Custom Param Decorator phân tích và lấy thông tin thiết bị (OS, Browser, Device Type)
 */
export const DeviceInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IDeviceInfo => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const userAgent = req.headers['user-agent'];
    return UserAgentHelper.parse(userAgent);
  },
);
