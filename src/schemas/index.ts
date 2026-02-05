import { z } from 'zod'

export const commodityEnum = z.enum([
  'CATTLE',
  'COCOA',
  'COFFEE',
  'PALM_OIL',
  'RUBBER',
  'SOY',
  'WOOD'
])

export const countryEnum = z.enum([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'AR', 'BR', 'CO', 'ID', 'MY', 'NG', 'PE', 'TH', 'VN'
])

export const geometryTypeEnum = z.enum(['POINT', 'POLYGON'])

export const passwordSchema = z.string().min(12).regex(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{12,}$/,
  'Password must contain uppercase, lowercase, number, and special character'
)

export const emailSchema = z.string().email()

export const supplierCreateSchema = z.object({
  name: z.string().min(1).max(255),
  country: countryEnum,
  commodity: commodityEnum,
  contactEmail: emailSchema.optional(),
  contactPhone: z.string().optional()
})

export const supplierUpdateSchema = supplierCreateSchema.partial()

export const productionPlaceCreateSchema = z.object({
  supplierId: z.string().uuid(),
  name: z.string().min(1).max(255),
  areaHectares: z.number().positive().max(100000),
  geometryType: geometryTypeEnum,
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(1),
  country: countryEnum
})

export const exportOptionsSchema = z.object({
  supplierIds: z.array(z.string().uuid()).optional(),
  commodity: commodityEnum.optional(),
  convertSmallToPoints: z.boolean().default(false),
  simplifyTolerance: z.number().min(0).max(0.001).optional(),
  includeAuditLog: z.boolean().default(false)
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
})

export const registerSchema = z.object({
  companyName: z.string().min(1).max(255),
  email: emailSchema,
  password: passwordSchema,
  country: countryEnum
})

export const paginationSchema = z.object({
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(20)
})

export function createPaginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

export type Commodity = z.infer<typeof commodityEnum>
export type Country = z.infer<typeof countryEnum>
export type GeometryType = z.infer<typeof geometryTypeEnum>
export type SupplierCreate = z.infer<typeof supplierCreateSchema>
export type ProductionPlaceCreate = z.infer<typeof productionPlaceCreateSchema>
export type ExportOptions = z.infer<typeof exportOptionsSchema>
export type Login = z.infer<typeof loginSchema>
export type Register = z.infer<typeof registerSchema>
export type SupplierUpdate = z.infer<typeof supplierUpdateSchema>
