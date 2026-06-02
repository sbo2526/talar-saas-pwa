-- AlterTable
ALTER TABLE "ContractLineItem" ADD COLUMN     "pricingType" "ServicePricingType",
ADD COLUMN     "unitLabel" TEXT;

-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "allowPriceOverride" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pricingType" "ServicePricingType" NOT NULL DEFAULT 'PER_GUEST',
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'نفر';

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "allowPriceOverride" BOOLEAN NOT NULL DEFAULT true;
