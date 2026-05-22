import { Test, TestingModule } from '@nestjs/testing';
import { LogisticsService } from './logistics.service';

describe('LogisticsService', () => {
  let service: LogisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogisticsService],
    }).compile();

    service = module.get<LogisticsService>(LogisticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkCodEligibility', () => {
    it('should return available: true for eligible orders', () => {
      const result = service.checkCodEligibility('411001', 1000);
      expect(result.available).toBe(true);
    });

    it('should reject orders below minimum COD value', () => {
      const result = service.checkCodEligibility('400001', 499);
      expect(result.available).toBe(false);
      expect(result.reason).toContain('Minimum order value');
    });

    it('should reject high-risk pin codes regardless of order value', () => {
      const result = service.checkCodEligibility('110001', 5000);
      expect(result.available).toBe(false);
      expect(result.reason).toContain('high delivery risk');
    });

    it('should accept regular pin codes with sufficient order value', () => {
      const result = service.checkCodEligibility('411001', 500);
      expect(result.available).toBe(true);
    });

    it('should accept regular pin codes at exact minimum threshold', () => {
      const result = service.checkCodEligibility('411001', 500);
      expect(result.available).toBe(true);
    });
  });
});