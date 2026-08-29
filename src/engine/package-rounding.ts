export interface PackageRoundingResult {
  packageCount: number;
  suppliedQuantity: number;
  surplusQuantity: number;
  totalMinor: number;
}

export function roundToPackages(
  requiredQuantity: number,
  packageSize: number,
  priceMinor: number,
): PackageRoundingResult {
  if (!Number.isFinite(requiredQuantity) || requiredQuantity < 0) {
    throw new Error("Required quantity must be a finite non-negative number");
  }
  if (!Number.isFinite(packageSize) || packageSize <= 0) {
    throw new Error("Package size must be a finite positive number");
  }
  if (!Number.isInteger(priceMinor) || priceMinor < 0) {
    throw new Error("Package price must be a non-negative integer in minor units");
  }

  const packageCount = Math.ceil(requiredQuantity / packageSize);
  const suppliedQuantity = packageCount * packageSize;
  return {
    packageCount,
    suppliedQuantity,
    surplusQuantity: suppliedQuantity - requiredQuantity,
    totalMinor: packageCount * priceMinor,
  };
}
