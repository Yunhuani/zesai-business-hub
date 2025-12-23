import { describe, it, expect } from 'vitest';
import { getSessionCookieOptions } from './_core/cookies';

describe('Cookie Domain Configuration', () => {
  it('should extract root domain correctly from www subdomain', () => {
    const mockReq = {
      hostname: 'www.zesiai.com',
      protocol: 'https',
      headers: {},
    } as any;

    const options = getSessionCookieOptions(mockReq);
    
    expect(options.domain).toBe('.zesiai.com');
    expect(options.secure).toBe(true);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
  });

  it('should handle localhost correctly', () => {
    const mockReq = {
      hostname: 'localhost',
      protocol: 'http',
      headers: {},
    } as any;

    const options = getSessionCookieOptions(mockReq);
    
    expect(options.domain).toBeUndefined();
    expect(options.secure).toBe(false);
  });

  it('should handle IP addresses correctly', () => {
    const mockReq = {
      hostname: '127.0.0.1',
      protocol: 'http',
      headers: {},
    } as any;

    const options = getSessionCookieOptions(mockReq);
    
    expect(options.domain).toBeUndefined();
  });

  it('should detect HTTPS from x-forwarded-proto header', () => {
    const mockReq = {
      hostname: 'www.zesiai.com',
      protocol: 'http',
      headers: {
        'x-forwarded-proto': 'https',
      },
    } as any;

    const options = getSessionCookieOptions(mockReq);
    
    expect(options.secure).toBe(true);
  });

  it('should handle multi-level subdomains', () => {
    const mockReq = {
      hostname: 'api.www.zesiai.com',
      protocol: 'https',
      headers: {},
    } as any;

    const options = getSessionCookieOptions(mockReq);
    
    // Should still extract zesiai.com as root domain
    expect(options.domain).toBe('.zesiai.com');
  });
});
