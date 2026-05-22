import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CartService', () => {
  let service: CartService;
  let prisma: PrismaService;

  const mockProduct = {
    id: 'prod-1',
    name: 'Silk Saree',
    price: 3000,
    images: [],
    quantity: 10,
    isHandloom: true,
    status: 'ACTIVE',
  };

  const mockCart = {
    id: 'cart-1',
    userId: 'user-1',
    items: [],
  };

  const mockCartItem = {
    id: 'ci-1',
    cartId: 'cart-1',
    productId: 'prod-1',
    product: mockProduct,
    quantity: 1,
    fallPico: false,
  };

  const mockCartWithItems = {
    id: 'cart-1',
    userId: 'user-1',
    items: [mockCartItem],
  };

  const formattedCartResponse = {
    id: 'cart-1',
    items: [{
      id: 'ci-1',
      productId: 'prod-1',
      product: mockProduct,
      quantity: 1,
      fallPico: false,
      fallPicoPrice: 0,
      itemTotal: 3000,
    }],
    itemCount: 1,
    subtotal: 3000,
    gst: 150,
    shippingCost: 99,
    total: 3249,
  };

  const mockPrismaService = {
    cart: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    cartItem: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    $connect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateCart', () => {
    it('should return existing cart if found', async () => {
      const existingCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [{
          ...mockCartItem,
          product: mockProduct,
        }],
      };
      mockPrismaService.cart.findUnique.mockResolvedValue(existingCart);

      const result = await service.getOrCreateCart('user-1');

      expect(prisma.cart.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: expect.objectContaining({
          items: expect.any(Object),
        }),
      });
    });

    it('should create a new cart if none exists', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(null);
      mockPrismaService.cart.create.mockResolvedValue({
        id: 'cart-new',
        userId: 'user-1',
        items: [],
      });

      const result = await service.getOrCreateCart('user-1');

      expect(prisma.cart.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
        include: expect.any(Object),
      });
    });
  });

  describe('addItem', () => {
    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.addItem('user-1', { productId: 'non-existent', quantity: 1 }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when product is not ACTIVE', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({ ...mockProduct, status: 'INACTIVE' });

      await expect(service.addItem('user-1', { productId: 'prod-1', quantity: 1 }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when quantity is less than 1', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCartWithItems);

      await expect(service.addItem('user-1', { productId: 'prod-1', quantity: 0 }))
        .rejects.toThrow('Quantity must be at least 1');
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({ ...mockProduct, quantity: 0 });
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);

      await expect(service.addItem('user-1', { productId: 'prod-1', quantity: 1 }))
        .rejects.toThrow('available in stock');
    });

    it('should throw if adding quantity exceeds available stock', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({ ...mockProduct, quantity: 2 });
      const cartItemWithQty = { ...mockCartItem, quantity: 2 };
      mockPrismaService.cart.findUnique.mockResolvedValue({
        ...mockCart,
        items: [cartItemWithQty],
      });

      await expect(service.addItem('user-1', { productId: 'prod-1', quantity: 1 }))
        .rejects.toThrow('available in stock');
    });

    it('should create a new cart if none exists and add item', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.cart.findUnique
        .mockResolvedValueOnce(null) // first call in addItem
        .mockResolvedValue({ // second call in getOrCreateCart
          id: 'cart-1',
          userId: 'user-1',
          items: [{ ...mockCartItem, product: mockProduct }],
        });
      mockPrismaService.cart.create.mockResolvedValue({ id: 'cart-1', userId: 'user-1', items: [] });
      mockPrismaService.cartItem.create.mockResolvedValue(mockCartItem);

      const result = await service.addItem('user-1', { productId: 'prod-1', quantity: 1, fallPico: false });
      expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
    });

    it('should update existing cart item quantity when adding same product', async () => {
      const existingItem = { ...mockCartItem, quantity: 1, fallPico: false };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.cart.findUnique.mockResolvedValue({
        ...mockCart,
        items: [existingItem],
      });
      mockPrismaService.cartItem.update.mockResolvedValue({ ...existingItem, quantity: 2 });
      // For getOrCreateCart at the end
      mockPrismaService.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [{ ...existingItem, quantity: 2, product: mockProduct }],
      });

      const result = await service.addItem('user-1', { productId: 'prod-1', quantity: 1, fallPico: false });

      expect(prisma.cartItem.update).toHaveBeenCalled();
    });

    it('should default quantity to 1 when not provided', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      // First call in addItem: cart exists with empty items
      mockPrismaService.cart.findUnique
        .mockResolvedValueOnce({ ...mockCart, items: [] })
        // Second call in getOrCreateCart: return cart with the added item
        .mockResolvedValueOnce({
          id: 'cart-1',
          userId: 'user-1',
          items: [{ ...mockCartItem, product: mockProduct }],
        });
      mockPrismaService.cartItem.create.mockResolvedValue(mockCartItem);

      await service.addItem('user-1', { productId: 'prod-1' });

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quantity: 1 }),
        }),
      );
    });

    it('should default fallPico to false when not provided', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      // cart exists with no existing items matching
      mockPrismaService.cart.findUnique
        .mockResolvedValueOnce({ ...mockCart, items: [] })
        .mockResolvedValueOnce({
          id: 'cart-1',
          userId: 'user-1',
          items: [{ ...mockCartItem, product: mockProduct }],
        });
      mockPrismaService.cartItem.create.mockResolvedValue(mockCartItem);

      await service.addItem('user-1', { productId: 'prod-1', quantity: 1 });

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fallPico: false }),
        }),
      );
    });
  });

  describe('removeItem', () => {
    it('should throw NotFoundException if cart item not found', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(null);

      await expect(service.removeItem('user-1', 'non-existent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if cart item belongs to another user', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        cart: { userId: 'user-2' },
      });

      await expect(service.removeItem('user-1', 'ci-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should remove item and return updated cart', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        cart: { userId: 'user-1' },
      });
      mockPrismaService.cartItem.delete.mockResolvedValue(mockCartItem);
      // getOrCreateCart after delete
      mockPrismaService.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [],
      });

      const result = await service.removeItem('user-1', 'ci-1');

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'ci-1' } });
    });
  });

  describe('updateItemQuantity', () => {
    it('should delegate to removeItem if quantity < 1', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(null);

      // updateItemQuantity with quantity 0 should delegate to removeItem
      // which should throw NotFoundException since item not found
      await expect(service.updateItemQuantity('user-1', 'ci-1', 0))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if cart item not found', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(null);

      await expect(service.updateItemQuantity('user-1', 'non-existent', 2))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if cart item belongs to different user', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        cart: { userId: 'user-2' },
        product: mockProduct,
      });

      await expect(service.updateItemQuantity('user-1', 'ci-1', 2))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quantity exceeds stock', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        cart: { userId: 'user-1' },
        product: { ...mockProduct, quantity: 2 },
      });

      await expect(service.updateItemQuantity('user-1', 'ci-1', 5))
        .rejects.toThrow(BadRequestException);
    });

    it('should update quantity and return cart', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        cart: { userId: 'user-1' },
        product: mockProduct,
      });
      mockPrismaService.cartItem.update.mockResolvedValue({ ...mockCartItem, quantity: 3 });
      mockPrismaService.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [{ ...mockCartItem, quantity: 3, product: mockProduct }],
      });

      const result = await service.updateItemQuantity('user-1', 'ci-1', 3);

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ci-1' },
          data: { quantity: 3 },
        }),
      );
    });
  });

  describe('toggleFallPico', () => {
    it('should throw NotFoundException if cart item not found', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(null);

      await expect(service.toggleFallPico('user-1', 'ci-1', true))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if cart item belongs to different user', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        cart: { userId: 'user-2' },
      });

      await expect(service.toggleFallPico('user-1', 'ci-1', true))
        .rejects.toThrow(NotFoundException);
    });

    it('should update fallPico on the item if no duplicate exists', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        cart: { userId: 'user-1', id: 'cart-1' },
      });
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);
      mockPrismaService.cartItem.update.mockResolvedValue({ ...mockCartItem, fallPico: true });
      mockPrismaService.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [{ ...mockCartItem, fallPico: true, fallPicoPrice: 450, product: mockProduct }],
      });

      await service.toggleFallPico('user-1', 'ci-1', true);

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ci-1' },
          data: { fallPico: true },
        }),
      );
    });

    it('should merge quantities and delete original when duplicate exists', async () => {
      const duplicateItem = { id: 'ci-2', cartId: 'cart-1', productId: 'prod-1', fallPico: true, quantity: 2 };
      mockPrismaService.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        cart: { userId: 'user-1', id: 'cart-1' },
        quantity: 1,
      });
      mockPrismaService.cartItem.findFirst.mockResolvedValue(duplicateItem);
      mockPrismaService.cartItem.update.mockResolvedValue({ ...duplicateItem, quantity: 3 });
      mockPrismaService.cartItem.delete.mockResolvedValue(mockCartItem);
      mockPrismaService.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [{ ...duplicateItem, quantity: 3, product: mockProduct }],
      });

      await service.toggleFallPico('user-1', 'ci-1', true);

      // Should merge into duplicate and delete original
      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ci-2' },
          data: { quantity: 3 },
        }),
      );
      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'ci-1' } });
    });
  });

  describe('validateCartForCheckout', () => {
    it('should throw BadRequestException when cart is empty', async () => {
      const emptyCart = {
        id: 'cart-1',
        items: [],
      };
      mockPrismaService.cart.findUnique.mockResolvedValue(emptyCart);

      await expect(service.validateCartForCheckout('user-1'))
        .rejects.toThrow('Cart is empty');
    });

    it('should throw BadRequestException when item quantity exceeds stock', async () => {
      const cartWithInsufficientStock = {
        id: 'cart-1',
        items: [{
          ...mockCartItem,
          product: { ...mockProduct, quantity: 0 },
          quantity: 1,
        }],
      };
      mockPrismaService.cart.findUnique.mockResolvedValue(cartWithInsufficientStock);

      await expect(service.validateCartForCheckout('user-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should return cart when validation passes', async () => {
      const validCart = {
        id: 'cart-1',
        items: [{
          ...mockCartItem,
          product: { ...mockProduct, quantity: 10 },
          quantity: 1,
        }],
      };
      mockPrismaService.cart.findUnique.mockResolvedValue(validCart);

      const result = await service.validateCartForCheckout('user-1');
      expect(result).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
    });
  });

  describe('clearCart', () => {
    it('should throw NotFoundException when cart not found', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(null);

      await expect(service.clearCart('user-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should clear all items from cart', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue({ id: 'cart-1', userId: 'user-1' });
      mockPrismaService.cartItem.deleteMany.mockResolvedValue({ count: 2 });
      // getOrCreateCart called after clearing
      mockPrismaService.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [],
      });

      const result = await service.clearCart('user-1');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
    });
  });

  describe('mergeCartItems', () => {
    it('should return existing cart if no local items provided', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [],
      });

      const result = await service.mergeCartItems('user-1', []);

      expect(result).toBeDefined();
    });

    it('should return existing cart if local items is null', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [],
      });

      const result = await service.mergeCartItems('user-1', null as any);

      expect(result).toBeDefined();
    });

    it('should attempt to add each local item to the cart', async () => {
      const localItems = [
        { productId: 'prod-1', quantity: 1, fallPico: false },
        { productId: 'prod-2', quantity: 2, fallPico: true },
      ];

      // First addItem call
      mockPrismaService.product.findUnique
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({ ...mockProduct, id: 'prod-2', price: 2000 });
      mockPrismaService.cart.findUnique
        .mockResolvedValue(mockCart);
      mockPrismaService.cartItem.create.mockResolvedValue(mockCartItem);
      // getOrCreateCart calls
      mockPrismaService.cart.findUnique
        .mockResolvedValue({
          id: 'cart-1',
          userId: 'user-1',
          items: [mockCartItem],
        });

      const result = await service.mergeCartItems('user-1', localItems);
      expect(result).toBeDefined();
    });

    it('should continue on error when adding individual items fails', async () => {
      const localItems = [
        { productId: 'non-existent', quantity: 1 },
        { productId: 'prod-1', quantity: 1 },
      ];

      // First call fails (product not found)
      mockPrismaService.product.findUnique
        .mockResolvedValueOnce(null) // first item product not found
        .mockResolvedValueOnce(mockProduct); // second item succeeds
      mockPrismaService.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [mockCartItem],
      });
      mockPrismaService.cartItem.create.mockResolvedValue(mockCartItem);

      // Should not throw
      const result = await service.mergeCartItems('user-1', localItems);
      expect(result).toBeDefined();
    });
  });

  describe('formatCartResponse (via getOrCreateCart)', () => {
    it('should calculate item total correctly with fallPico', async () => {
      const cartWithFallPico = {
        id: 'cart-1',
        userId: 'user-1',
        items: [{
          ...mockCartItem,
          fallPico: true,
          product: mockProduct,
        }],
      };
      mockPrismaService.cart.findUnique.mockResolvedValue(cartWithFallPico);

      const result = await service.getOrCreateCart('user-1');

      // fallPico adds 450 to the price
      expect(result.items[0].fallPicoPrice).toBe(450);
      expect(result.items[0].itemTotal).toBe((3000 + 450) * 1);
    });

    it('should calculate shipping cost as free for orders >= 5000', async () => {
      const expensiveProduct = { ...mockProduct, price: 6000 };
      const cartWithExpensiveItem = {
        id: 'cart-1',
        userId: 'user-1',
        items: [{
          ...mockCartItem,
          product: expensiveProduct,
          quantity: 1,
          fallPico: false,
        }],
      };
      mockPrismaService.cart.findUnique.mockResolvedValue(cartWithExpensiveItem);

      const result = await service.getOrCreateCart('user-1');
      expect(result.shippingCost).toBe(0);
    });

    it('should calculate shipping cost as 99 for orders < 5000', async () => {
      const cart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [{
          ...mockCartItem,
          product: mockProduct,
          quantity: 1,
          fallPico: false,
        }],
      };
      mockPrismaService.cart.findUnique.mockResolvedValue(cart);

      const result = await service.getOrCreateCart('user-1');
      expect(result.shippingCost).toBe(99);
    });

    it('should calculate total as subtotal + gst + shippingCost', async () => {
      const cart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [{
          ...mockCartItem,
          product: mockProduct,
          quantity: 1,
          fallPico: false,
        }],
      };
      mockPrismaService.cart.findUnique.mockResolvedValue(cart);

      const result = await service.getOrCreateCart('user-1');
      expect(result.total).toBe(result.subtotal + result.gst + result.shippingCost);
    });

    it('should calculate itemCount as sum of all item quantities', async () => {
      const cart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          { ...mockCartItem, product: mockProduct, quantity: 2, fallPico: false },
          { ...mockCartItem, id: 'ci-2', product: { ...mockProduct, id: 'prod-2' }, quantity: 3, fallPico: false },
        ],
      };
      mockPrismaService.cart.findUnique.mockResolvedValue(cart);

      const result = await service.getOrCreateCart('user-1');
      expect(result.itemCount).toBe(5);
    });
  });
});