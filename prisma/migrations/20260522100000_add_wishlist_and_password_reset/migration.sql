-- AlterTable: Add unique constraint on phone for users (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"("phone");

-- CreateTable: WishlistItem
CREATE TABLE IF NOT EXISTS "wishlist_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id"),
    UNIQUE("userId", "productId")
);

-- CreateTable: PasswordReset
CREATE TABLE IF NOT EXISTS "password_resets" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_token_key" ON "password_resets"("token");

-- AddForeignKey: WishlistItem -> User
ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_userId_fkey";
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: WishlistItem -> Product
ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_productId_fkey";
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
