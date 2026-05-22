import { Injectable } from '@nestjs/common';

export interface TaxableItem {
  name: string;
  basePrice: number;
  servicePrice: number;
  isHandloom: boolean;
  hsnCode?: string;
}

export interface TaxCalculationResult {
  totalBase: number;
  totalService: number;
  gstRate: number;
  gstAmount: number;
  totalWithTax: number;
}

@Injectable()
export class TaxesService {
  private readonly HANDLOOM_BASE_RATE = 5;
  private readonly THRESHOLD_LOW = 1000;
  private readonly THRESHOLD_HIGH = 2500;
  private readonly RATE_MID = 12;
  private readonly RATE_HIGH = 18;

  calculateGST(item: TaxableItem): TaxCalculationResult {
    const totalValue = item.basePrice + item.servicePrice;
    let gstRate = this.HANDLOOM_BASE_RATE;

    // Logic: If tailoring/services are added, check thresholds
    if (item.servicePrice > 0) {
      if (totalValue > this.THRESHOLD_HIGH) {
        gstRate = this.RATE_HIGH;
      } else if (totalValue > this.THRESHOLD_LOW) {
        gstRate = this.RATE_MID;
      }
    } else if (!item.isHandloom && totalValue > this.THRESHOLD_LOW) {
      // Non-handloom apparel usually follows the standard >1000 12% rule
      gstRate = this.RATE_MID;
    }

    const gstAmount = (totalValue * gstRate) / 100;

    return {
      totalBase: item.basePrice,
      totalService: item.servicePrice,
      gstRate,
      gstAmount,
      totalWithTax: totalValue + gstAmount,
    };
  }
}
