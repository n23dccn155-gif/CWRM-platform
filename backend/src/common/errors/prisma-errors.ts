/**
 * Nhận diện lỗi của Prisma theo mã, không phụ thuộc lớp lỗi cụ thể của client sinh ra.
 * P2002: vi phạm unique (gồm cả index lower(name) chỉ có trong SQL); P2003: vi phạm khóa ngoại.
 */
export function isUniqueViolation(error: unknown): boolean {
  return prismaCode(error) === 'P2002';
}

export function isForeignKeyViolation(error: unknown): boolean {
  return prismaCode(error) === 'P2003';
}

function prismaCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
