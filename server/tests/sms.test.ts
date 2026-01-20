import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Aliyun SMS SDK
vi.mock('@alicloud/dysmsapi20170525', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      sendSms: vi.fn().mockResolvedValue({
        body: { code: 'OK', message: 'OK' }
      })
    })),
    SendSmsRequest: vi.fn().mockImplementation((params) => params)
  };
});

vi.mock('@alicloud/openapi-client', () => {
  return {
    default: {
      Config: vi.fn().mockImplementation((params) => ({
        ...params,
        endpoint: ''
      }))
    }
  };
});

describe('SMS Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variables
    process.env.ALIYUN_SMS_ACCESS_KEY_ID = 'test_key_id';
    process.env.ALIYUN_SMS_ACCESS_KEY_SECRET = 'test_key_secret';
    process.env.ALIYUN_SMS_SIGN_NAME = '云珩科技';
    process.env.ALIYUN_SMS_TEMPLATE_CODE = 'SMS_500950177';
  });

  it('should generate 6-digit code', async () => {
    const { generateCode } = await import('../lib/sms');
    const code = generateCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('should validate phone number format', async () => {
    const { isValidPhone } = await import('../lib/sms');
    expect(isValidPhone('13800138000')).toBe(true);
    expect(isValidPhone('18612345678')).toBe(true);
    expect(isValidPhone('12345678901')).toBe(false);
    expect(isValidPhone('1380013800')).toBe(false);
    expect(isValidPhone('138001380001')).toBe(false);
    expect(isValidPhone('abc')).toBe(false);
  });

  it('should send SMS code successfully with mocked SDK', async () => {
    const { sendSmsCode } = await import('../lib/sms');
    const result = await sendSmsCode('13800138000', '123456');
    expect(result.success).toBe(true);
    expect(result.message).toBe('验证码已发送');
  });
});
