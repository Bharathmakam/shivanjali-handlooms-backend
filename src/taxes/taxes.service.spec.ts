import { TaxesService } from './taxes.service';

describe('TaxesService', () => {
  let service: TaxesService;

  beforeEach(() => {
    service = new TaxesService();
  });

  describe('calculateGST', () => {
    it('should apply 5% GST for handloom items', () => {
      const result = service.calculateGST({
        name: 'Handloom Saree',
        basePrice: 2000,
        servicePrice: 0,
        isHandloom: true,
      });
      expect(result.gstRate).toBe(5);
      expect(result.gstAmount).toBe(100);
      expect(result.totalWithTax).toBe(2100);
    });

    it('should apply 5% GST for cheap handloom items', () => {
      const result = service.calculateGST({
        name: 'Cheap Saree',
        basePrice: 500,
        servicePrice: 0,
        isHandloom: true,
      });
      expect(result.gstRate).toBe(5);
    });

    it('should apply 12% GST for non-handloom items above 1000', () => {
      const result = service.calculateGST({
        name: 'Fancy Saree',
        basePrice: 1500,
        servicePrice: 0,
        isHandloom: false,
      });
      expect(result.gstRate).toBe(12);
    });

    it('should apply 5% GST for non-handloom items below 1000', () => {
      const result = service.calculateGST({
        name: 'Cheap Fancy',
        basePrice: 500,
        servicePrice: 0,
        isHandloom: false,
      });
      expect(result.gstRate).toBe(5);
    });

    it('should apply 12% GST for handloom + service above 1000', () => {
      const result = service.calculateGST({
        name: 'Saree with tailoring',
        basePrice: 1500,
        servicePrice: 450,
        isHandloom: true,
      });
      expect(result.gstRate).toBe(12);
    });

    it('should apply 18% GST for items with service above 2500', () => {
      const result = service.calculateGST({
        name: 'Premium Saree',
        basePrice: 3000,
        servicePrice: 450,
        isHandloom: true,
      });
      expect(result.gstRate).toBe(18);
    });

    it('should calculate gstAmount correctly', () => {
      const result = service.calculateGST({
        name: 'Test',
        basePrice: 1000,
        servicePrice: 0,
        isHandloom: true,
      });
      expect(result.gstAmount).toBe(50); // 1000 * 5%
      expect(result.totalBase).toBe(1000);
      expect(result.totalService).toBe(0);
      expect(result.totalWithTax).toBe(1050);
    });
  });
});