import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    verifyEmail: jest.fn(),
    adminLogin: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call validateUser and login', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: 'CUSTOMER' };
      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.login.mockResolvedValue({ access_token: 'token', user: mockUser });

      const result = await controller.login({ identifier: 'test@example.com', password: 'password123' });

      expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(result.access_token).toBe('token');
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(controller.login({ identifier: 'test@example.com', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      const registerDto = {
        firstName: 'Test',
        lastName: 'User',
        email: 'new@example.com',
        phone: '1234567890',
        password: 'password123',
      };
      mockAuthService.register.mockResolvedValue({ message: 'Registration successful', user: { id: '1' } });

      const result = await controller.register(registerDto);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('verifyEmail', () => {
    it('should call authService.verifyEmail', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({ access_token: 'token', user: {} });

      const result = await controller.verifyEmail({ email: 'test@example.com', otp: '123456' });
      expect(authService.verifyEmail).toHaveBeenCalledWith('test@example.com', '123456');
    });
  });

  describe('adminLogin', () => {
    it('should call authService.adminLogin', async () => {
      mockAuthService.adminLogin.mockResolvedValue({ access_token: 'admin-token', user: {} });

      const result = await controller.adminLogin({ identifier: 'admin@example.com', password: 'adminpass' });
      expect(authService.adminLogin).toHaveBeenCalledWith('admin@example.com', 'adminpass');
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword', async () => {
      mockAuthService.forgotPassword.mockResolvedValue({ message: 'Reset token generated', token: 'abc' });

      const result = await controller.forgotPassword({ email: 'test@example.com' });
      expect(authService.forgotPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword', async () => {
      mockAuthService.resetPassword.mockResolvedValue({ message: 'Password has been reset successfully' });

      const result = await controller.resetPassword({
        email: 'test@example.com',
        token: 'valid-token',
        newPassword: 'newPassword123',
      });
      expect(authService.resetPassword).toHaveBeenCalledWith('test@example.com', 'valid-token', 'newPassword123');
    });
  });
});