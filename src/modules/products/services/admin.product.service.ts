import crypto from 'crypto';
import type { EntityManager, Repository } from 'typeorm';
import { In } from 'typeorm';
import { AppDataSource } from '../../../database/data-source';
import { Product } from '../../../database/entities/Product';
import { ProductVariant } from '../../../database/entities/ProductVariant';
import { ProductImage } from '../../../database/entities/ProductImage';
import { Size } from '../../../database/entities/Size';
import { Color } from '../../../database/entities/Color';
import { Category } from '../../../database/entities/Category';
import { Brand } from '../../../database/entities/Brand';
import { Sport } from '../../../database/entities/Sport';
import type {
  CreateAdminProductDto,
  CreateProductImageDto,
  CreateProductVariantDto,
} from '../dtos/admin-create-product.dto';

let dataSourceInit: Promise<void> | null = null;

async function ensureDataSource() {
  if (AppDataSource.isInitialized) {
    return;
  }

  if (!dataSourceInit) {
    dataSourceInit = AppDataSource.initialize().then(() => undefined);
  }

  await dataSourceInit;
}

type CatalogSize = {
  id: string;
  name: string;
  type: 'ropa' | 'calzado' | 'unico';
  sort_order: number;
};

type CatalogColor = {
  id: string;
  name: string;
  hex: string | null;
};

type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
};

type CatalogBrand = {
  id: string;
  name: string;
  slug: string;
};

type CatalogSport = {
  id: string;
  name: string;
  slug: string;
};

type CreateProductResponse = {
  id: string;
  name: string;
  slug: string | null;
  description: string;
  category_id: string | null;
  brand_id: string | null;
  sport_id: string | null;
  is_active: boolean;
  is_featured: boolean;
  images: Array<{
    id: string;
    url: string;
    is_main: boolean;
    sort_order: number;
  }>;
  variants: Array<{
    id: string;
    sku: string;
    size: { id: string; name: string } | null;
    color: { id: string; name: string; hex: string | null } | null;
    base_price: number;
    discount_percentage: number;
    final_price: number;
    stock: number;
    low_stock_threshold: number;
    is_active: boolean;
  }>;
};

type ProductDetailResponse = CreateProductResponse & {
  created_at: Date;
  updated_at: Date;
};

function slugifyName(value: string): string {
  const base = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'producto';
}

function buildSkuBase(productId: string, sizeName?: string | null, colorName?: string | null) {
  const sizePart = sizeName ? sizeName.toLowerCase().replace(/\s+/g, '-') : 'nosize';
  const colorPart = colorName ? colorName.toLowerCase().replace(/\s+/g, '-') : 'nocolor';
  return `SKU-${productId.slice(0, 8)}-${sizePart}-${colorPart}`;
}

function buildSkuCandidate(productId: string, sizeName?: string | null, colorName?: string | null) {
  const suffix = crypto.randomBytes(2).toString('hex');
  return `${buildSkuBase(productId, sizeName, colorName)}-${suffix}`;
}

function computeFinalPrice(base: number, discount: number) {
  const safeDiscount = Math.min(Math.max(discount, 0), 100);
  const raw = base * (1 - safeDiscount / 100);
  return Math.round(raw * 100) / 100;
}

async function buildUniqueSlug(
  productRepo: Repository<Product>,
  baseSlug: string,
  excludeId?: string,
) {
  let slug = baseSlug;
  let slugAttempts = 0;

  while (slugAttempts < 5) {
    const existing = await productRepo.findOne({ where: { slug } });
    if (!existing || (excludeId && existing.id === excludeId)) {
      return slug;
    }
    slug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
    slugAttempts += 1;
  }

  throw new Error('No se pudo generar slug unico.');
}

async function resolveLegacyCategory(
  manager: EntityManager,
  categoryId?: string | null,
) {
  if (!categoryId) {
    return 'legacy';
  }
  try {
    const categoryRow = await manager.query('SELECT name FROM categories WHERE id = $1 LIMIT 1', [
      categoryId,
    ]);
    if (Array.isArray(categoryRow) && categoryRow[0]?.name) {
      return String(categoryRow[0].name);
    }
  } catch (_error) {
    return 'legacy';
  }
  return 'legacy';
}

function mapVariantResponse(
  variant: ProductVariant,
  sizesById: Map<string, Size>,
  colorsById: Map<string, Color>,
) {
  const size = variant.sizeId ? sizesById.get(variant.sizeId) : null;
  const color = variant.colorId ? colorsById.get(variant.colorId) : null;
  const basePrice = Number(variant.basePrice);
  const discount = variant.discountPercentage ?? 0;
  return {
    id: variant.id,
    sku: variant.sku,
    size: size ? { id: size.id, name: size.name } : null,
    color: color ? { id: color.id, name: color.name, hex: color.hex ?? null } : null,
    base_price: basePrice,
    discount_percentage: discount,
    final_price: computeFinalPrice(basePrice, discount),
    stock: variant.stock,
    low_stock_threshold: variant.lowStockThreshold,
    is_active: variant.isActive,
  };
}

function normalizeImages(images?: CreateProductImageDto[]) {
  if (!images || images.length === 0) {
    return [];
  }

  const normalized = images.map((image, index) => ({
    url: image.url,
    is_main: image.is_main ?? false,
    sort_order: image.sort_order ?? index + 1,
  }));

  const hasMain = normalized.some((image) => image.is_main);
  if (!hasMain) {
    normalized[0].is_main = true;
  } else {
    const firstMain = normalized.findIndex((image) => image.is_main);
    normalized.forEach((image, index) => {
      if (index !== firstMain) {
        image.is_main = false;
      }
    });
  }

  return normalized;
}

function buildVariantKey(variant: CreateProductVariantDto) {
  return `${variant.size_id ?? 'null'}:${variant.color_id ?? 'null'}`;
}

export const adminProductService = {
  async listSizes(type?: 'ropa' | 'calzado' | 'unico'): Promise<CatalogSize[]> {
    await ensureDataSource();
    const repo = AppDataSource.getRepository(Size);
    const where = type ? { type } : {};
    const sizes = await repo.find({ where, order: { sortOrder: 'ASC' } });
    return sizes.map((size) => ({
      id: size.id,
      name: size.name,
      type: size.type,
      sort_order: size.sortOrder,
    }));
  },

  async listColors(): Promise<CatalogColor[]> {
    await ensureDataSource();
    const repo = AppDataSource.getRepository(Color);
    const colors = await repo.find({ order: { name: 'ASC' } });
    return colors.map((color) => ({
      id: color.id,
      name: color.name,
      hex: color.hex ?? null,
    }));
  },

  async listCategories(): Promise<CatalogCategory[]> {
    await ensureDataSource();
    const repo = AppDataSource.getRepository(Category);
    let categories = await repo.find({ order: { name: 'ASC' } });

    const existingNames = new Set(
      categories.map((category) => category.name.trim().toLowerCase()),
    );
    const existingSlugs = new Set(categories.map((category) => category.slug));

    const legacyRows = await AppDataSource.getRepository(Product)
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.category IS NOT NULL')
      .andWhere("product.category <> ''")
      .orderBy('product.category', 'ASC')
      .getRawMany<{ category: string }>();

    const toInsert: Category[] = [];

    for (const row of legacyRows) {
      const raw = row.category?.trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (existingNames.has(key)) {
        continue;
      }

      let slug = slugifyName(raw);
      let attempts = 0;
      while (existingSlugs.has(slug) && attempts < 5) {
        slug = `${slugifyName(raw)}-${crypto.randomBytes(2).toString('hex')}`;
        attempts += 1;
      }
      if (existingSlugs.has(slug)) {
        continue;
      }

      existingNames.add(key);
      existingSlugs.add(slug);
      toInsert.push(repo.create({ name: raw, slug }));
    }

    if (toInsert.length > 0) {
      await repo.save(toInsert);
      categories = await repo.find({ order: { name: 'ASC' } });
    }

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    }));
  },

  async listBrands(): Promise<CatalogBrand[]> {
    await ensureDataSource();
    const repo = AppDataSource.getRepository(Brand);
    const brands = await repo.find({ order: { name: 'ASC' } });
    return brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
    }));
  },

  async listSports(): Promise<CatalogSport[]> {
    await ensureDataSource();
    const repo = AppDataSource.getRepository(Sport);
    const sports = await repo.find({ order: { name: 'ASC' } });
    return sports.map((sport) => ({
      id: sport.id,
      name: sport.name,
      slug: sport.slug,
    }));
  },

  async createProductWithVariants(dto: CreateAdminProductDto): Promise<CreateProductResponse> {
    await ensureDataSource();

    if (!dto.variants || dto.variants.length === 0) {
      throw new Error('Debe cargar al menos una variante.');
    }

    const variantKeys = new Set<string>();
    for (const variant of dto.variants) {
      const key = buildVariantKey(variant);
      if (variantKeys.has(key)) {
        throw new Error('Variantes duplicadas para el mismo talle/color.');
      }
      variantKeys.add(key);
    }

    if (
      dto.variants.length > 1 &&
      dto.variants.some((variant) => !variant.size_id && !variant.color_id)
    ) {
      throw new Error('Solo se permite una variante cuando talle y color son nulos.');
    }

    const sizeIds = dto.variants
      .map((variant) => variant.size_id)
      .filter((value): value is string => Boolean(value));
    const colorIds = dto.variants
      .map((variant) => variant.color_id)
      .filter((value): value is string => Boolean(value));

    const [sizes, colors] = await Promise.all([
      sizeIds.length
        ? AppDataSource.getRepository(Size).find({ where: { id: In(sizeIds) } })
        : Promise.resolve([]),
      colorIds.length
        ? AppDataSource.getRepository(Color).find({ where: { id: In(colorIds) } })
        : Promise.resolve([]),
    ]);

    const sizesById = new Map(sizes.map((size) => [size.id, size]));
    const colorsById = new Map(colors.map((color) => [color.id, color]));

    const missingSize = sizeIds.find((id) => !sizesById.has(id));
    if (missingSize) {
      throw new Error('Talle no encontrado.');
    }

    const missingColor = colorIds.find((id) => !colorsById.has(id));
    if (missingColor) {
      throw new Error('Color no encontrado.');
    }

    const normalizedImages = normalizeImages(dto.images);

    return AppDataSource.manager.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const variantRepo = manager.getRepository(ProductVariant);
      const imageRepo = manager.getRepository(ProductImage);

      const baseSlug = slugifyName(dto.name);
      const slug = await buildUniqueSlug(productRepo, baseSlug);

      const basePrices = dto.variants.map((variant) => Number(variant.base_price));
      const totalStock = dto.variants.reduce((acc, variant) => acc + Number(variant.stock), 0);
      const legacyPrice = Math.min(...basePrices);
      const legacyDiscount =
        dto.variants.reduce((acc, variant) => acc + (variant.discount_percentage ?? 0), 0) /
        dto.variants.length;
      const legacyLowStock = Math.max(
        0,
        ...dto.variants.map((variant) => variant.low_stock_threshold ?? 0),
      );

      const legacyCategory = await resolveLegacyCategory(manager, dto.category_id);

      const product = productRepo.create({
        name: dto.name.trim(),
        slug,
        description: dto.description.trim(),
        categoryId: dto.category_id,
        brandId: dto.brand_id ?? null,
        sportId: dto.sport_id ?? null,
        isActive: dto.is_active ?? true,
        isFeatured: dto.is_featured ?? false,
        viewCount: 0,
        salesCount: 0,
        ratingAverage: '0',
        ratingCount: 0,
        // Legacy columns for compatibility (not source of truth).
        price: legacyPrice.toFixed(2),
        currency: 'ARS',
        stock: totalStock,
        discountPercent: Math.round(legacyDiscount),
        lowStockThreshold: legacyLowStock,
        category: legacyCategory,
        target: 'Unisex',
        images: null,
      });

      const savedProduct = await productRepo.save(product);

      const variantsToCreate: ProductVariant[] = [];
      const providedSkus = new Set<string>();

      for (const variant of dto.variants) {
        if (variant.sku) {
          if (providedSkus.has(variant.sku)) {
            throw new Error('SKU duplicado en la request.');
          }
          providedSkus.add(variant.sku);
        }
      }

      if (providedSkus.size > 0) {
        const existingSkus = await variantRepo.find({
          where: { sku: In(Array.from(providedSkus)) },
        });
        if (existingSkus.length > 0) {
          throw new Error('SKU ya existe en otra variante.');
        }
      }

      const usedSkus = new Set(providedSkus);

      for (const variant of dto.variants) {
        const size = variant.size_id ? sizesById.get(variant.size_id) : null;
        const color = variant.color_id ? colorsById.get(variant.color_id) : null;
        let sku = variant.sku;

        if (!sku) {
          let attempts = 0;
          while (attempts < 5) {
            const candidate = buildSkuCandidate(savedProduct.id, size?.name, color?.name);
            const exists = usedSkus.has(candidate)
              ? true
              : await variantRepo.findOne({ where: { sku: candidate } });
            if (!exists) {
              sku = candidate;
              break;
            }
            attempts += 1;
          }
          if (!sku) {
            throw new Error('No se pudo generar SKU unico.');
          }
        }

        if (sku && usedSkus.has(sku)) {
          throw new Error('SKU duplicado en la request.');
        }

        if (sku) {
          usedSkus.add(sku);
        }

        variantsToCreate.push(
          variantRepo.create({
            productId: savedProduct.id,
            sku,
            sizeId: variant.size_id ?? null,
            colorId: variant.color_id ?? null,
            basePrice: Number(variant.base_price).toFixed(2),
            discountPercentage: variant.discount_percentage ?? 0,
            stock: variant.stock,
            lowStockThreshold: variant.low_stock_threshold ?? 0,
            isActive: variant.is_active ?? true,
          }),
        );
      }

      const savedVariants = await variantRepo.save(variantsToCreate);

      const imagesToCreate = normalizedImages.map((image) =>
        imageRepo.create({
          productId: savedProduct.id,
          url: image.url,
          isMain: image.is_main,
          sortOrder: image.sort_order,
        }),
      );

      const savedImages = imagesToCreate.length > 0 ? await imageRepo.save(imagesToCreate) : [];

      return {
        id: savedProduct.id,
        name: savedProduct.name,
        slug: savedProduct.slug,
        description: savedProduct.description,
        category_id: savedProduct.categoryId,
        brand_id: savedProduct.brandId,
        sport_id: savedProduct.sportId,
        is_active: savedProduct.isActive,
        is_featured: savedProduct.isFeatured,
        images: savedImages
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((image) => ({
            id: image.id,
            url: image.url,
            is_main: image.isMain,
            sort_order: image.sortOrder,
          })),
        variants: savedVariants.map((variant) =>
          mapVariantResponse(variant, sizesById, colorsById),
        ),
      } satisfies CreateProductResponse;
    });
  },

  async updateProductWithVariants(
    productId: string,
    dto: CreateAdminProductDto,
  ): Promise<CreateProductResponse | null> {
    await ensureDataSource();

    if (!dto.variants || dto.variants.length === 0) {
      throw new Error('Debe cargar al menos una variante.');
    }

    const variantKeys = new Set<string>();
    for (const variant of dto.variants) {
      const key = buildVariantKey(variant);
      if (variantKeys.has(key)) {
        throw new Error('Variantes duplicadas para el mismo talle/color.');
      }
      variantKeys.add(key);
    }

    if (
      dto.variants.length > 1 &&
      dto.variants.some((variant) => !variant.size_id && !variant.color_id)
    ) {
      throw new Error('Solo se permite una variante cuando talle y color son nulos.');
    }

    const sizeIds = dto.variants
      .map((variant) => variant.size_id)
      .filter((value): value is string => Boolean(value));
    const colorIds = dto.variants
      .map((variant) => variant.color_id)
      .filter((value): value is string => Boolean(value));

    const [sizes, colors] = await Promise.all([
      sizeIds.length
        ? AppDataSource.getRepository(Size).find({ where: { id: In(sizeIds) } })
        : Promise.resolve([]),
      colorIds.length
        ? AppDataSource.getRepository(Color).find({ where: { id: In(colorIds) } })
        : Promise.resolve([]),
    ]);

    const sizesById = new Map(sizes.map((size) => [size.id, size]));
    const colorsById = new Map(colors.map((color) => [color.id, color]));

    const missingSize = sizeIds.find((id) => !sizesById.has(id));
    if (missingSize) {
      throw new Error('Talle no encontrado.');
    }

    const missingColor = colorIds.find((id) => !colorsById.has(id));
    if (missingColor) {
      throw new Error('Color no encontrado.');
    }

    const normalizedImages = normalizeImages(dto.images);

    return AppDataSource.manager.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const variantRepo = manager.getRepository(ProductVariant);
      const imageRepo = manager.getRepository(ProductImage);

      const product = await productRepo.findOne({ where: { id: productId } });
      if (!product) {
        return null;
      }

      const baseSlug = slugifyName(dto.name);
      const slug = await buildUniqueSlug(productRepo, baseSlug, productId);

      const basePrices = dto.variants.map((variant) => Number(variant.base_price));
      const totalStock = dto.variants.reduce((acc, variant) => acc + Number(variant.stock), 0);
      const legacyPrice = Math.min(...basePrices);
      const legacyDiscount =
        dto.variants.reduce((acc, variant) => acc + (variant.discount_percentage ?? 0), 0) /
        dto.variants.length;
      const legacyLowStock = Math.max(
        0,
        ...dto.variants.map((variant) => variant.low_stock_threshold ?? 0),
      );
      const legacyCategory = await resolveLegacyCategory(manager, dto.category_id);

      product.name = dto.name.trim();
      product.slug = slug;
      product.description = dto.description.trim();
      product.categoryId = dto.category_id;
      product.brandId = dto.brand_id ?? null;
      product.sportId = dto.sport_id ?? null;
      product.isActive = dto.is_active ?? true;
      product.isFeatured = dto.is_featured ?? false;
      product.price = legacyPrice.toFixed(2);
      product.currency = 'ARS';
      product.stock = totalStock;
      product.discountPercent = Math.round(legacyDiscount);
      product.lowStockThreshold = legacyLowStock;
      product.category = legacyCategory;
      product.target = product.target || 'Unisex';
      product.images = null;

      const savedProduct = await productRepo.save(product);

      await variantRepo.delete({ productId: savedProduct.id });
      await imageRepo.delete({ productId: savedProduct.id });

      const variantsToCreate: ProductVariant[] = [];
      const providedSkus = new Set<string>();

      for (const variant of dto.variants) {
        if (variant.sku) {
          if (providedSkus.has(variant.sku)) {
            throw new Error('SKU duplicado en la request.');
          }
          providedSkus.add(variant.sku);
        }
      }

      if (providedSkus.size > 0) {
        const existingSkus = await variantRepo.find({
          where: { sku: In(Array.from(providedSkus)) },
        });
        if (existingSkus.length > 0) {
          throw new Error('SKU ya existe en otra variante.');
        }
      }

      const usedSkus = new Set(providedSkus);

      for (const variant of dto.variants) {
        const size = variant.size_id ? sizesById.get(variant.size_id) : null;
        const color = variant.color_id ? colorsById.get(variant.color_id) : null;
        let sku = variant.sku;

        if (!sku) {
          let attempts = 0;
          while (attempts < 5) {
            const candidate = buildSkuCandidate(savedProduct.id, size?.name, color?.name);
            const exists = usedSkus.has(candidate)
              ? true
              : await variantRepo.findOne({ where: { sku: candidate } });
            if (!exists) {
              sku = candidate;
              break;
            }
            attempts += 1;
          }
          if (!sku) {
            throw new Error('No se pudo generar SKU unico.');
          }
        }

        if (sku && usedSkus.has(sku)) {
          throw new Error('SKU duplicado en la request.');
        }

        if (sku) {
          usedSkus.add(sku);
        }

        variantsToCreate.push(
          variantRepo.create({
            productId: savedProduct.id,
            sku,
            sizeId: variant.size_id ?? null,
            colorId: variant.color_id ?? null,
            basePrice: Number(variant.base_price).toFixed(2),
            discountPercentage: variant.discount_percentage ?? 0,
            stock: variant.stock,
            lowStockThreshold: variant.low_stock_threshold ?? 0,
            isActive: variant.is_active ?? true,
          }),
        );
      }

      const savedVariants = await variantRepo.save(variantsToCreate);

      const imagesToCreate = normalizedImages.map((image) =>
        imageRepo.create({
          productId: savedProduct.id,
          url: image.url,
          isMain: image.is_main,
          sortOrder: image.sort_order,
        }),
      );

      const savedImages = imagesToCreate.length > 0 ? await imageRepo.save(imagesToCreate) : [];

      return {
        id: savedProduct.id,
        name: savedProduct.name,
        slug: savedProduct.slug,
        description: savedProduct.description,
        category_id: savedProduct.categoryId,
        brand_id: savedProduct.brandId,
        sport_id: savedProduct.sportId,
        is_active: savedProduct.isActive,
        is_featured: savedProduct.isFeatured,
        images: savedImages
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((image) => ({
            id: image.id,
            url: image.url,
            is_main: image.isMain,
            sort_order: image.sortOrder,
          })),
        variants: savedVariants.map((variant) =>
          mapVariantResponse(variant, sizesById, colorsById),
        ),
      } satisfies CreateProductResponse;
    });
  },

  async getProductDetail(productId: string): Promise<ProductDetailResponse | null> {
    await ensureDataSource();
    const productRepo = AppDataSource.getRepository(Product);
    const imageRepo = AppDataSource.getRepository(ProductImage);
    const variantRepo = AppDataSource.getRepository(ProductVariant);
    const sizeRepo = AppDataSource.getRepository(Size);
    const colorRepo = AppDataSource.getRepository(Color);

    const product = await productRepo.findOne({ where: { id: productId } });
    if (!product) {
      return null;
    }

    const [images, variants, sizes, colors] = await Promise.all([
      imageRepo.find({ where: { productId }, order: { sortOrder: 'ASC' } }),
      variantRepo.find({ where: { productId }, order: { createdAt: 'ASC' } }),
      sizeRepo.find(),
      colorRepo.find(),
    ]);

    const sizesById = new Map(sizes.map((size) => [size.id, size]));
    const colorsById = new Map(colors.map((color) => [color.id, color]));

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category_id: product.categoryId,
      brand_id: product.brandId,
      sport_id: product.sportId,
      is_active: product.isActive,
      is_featured: product.isFeatured,
      images: images.map((image) => ({
        id: image.id,
        url: image.url,
        is_main: image.isMain,
        sort_order: image.sortOrder,
      })),
      variants: variants.map((variant) => mapVariantResponse(variant, sizesById, colorsById)),
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  },
};
