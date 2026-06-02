import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Like, Repository } from 'typeorm';
import { ProductCategory, ProductEntity, ProductStatus } from '../../database/entities';

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>) {}

  async list(keyword?: string, category?: string, page = 1, pageSize = 10) {
    const selectedCategory = Object.values(ProductCategory).includes(category as ProductCategory)
      ? (category as ProductCategory)
      : undefined;
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 10));
    const where = {
      status: ProductStatus.ON_SALE,
      ...(keyword ? { name: Like(`%${keyword}%`) } : {}),
      ...(selectedCategory ? { category: selectedCategory } : {}),
    };
    const [products, total] = await this.products.findAndCount({
      where: {
        ...where,
      },
      order: { sort: 'DESC', id: 'DESC' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    });
    return {
      items: products.map((product) => this.withAbsoluteImage(product)),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  async detail(id: string) {
    const product = await this.products.findOneBy({ id, status: ProductStatus.ON_SALE });
    if (!product) throw new NotFoundException('商品不存在或已下架');
    return this.withAbsoluteImage(product);
  }

  hotSaleImage() {
    const dir = join(process.cwd(), 'uploads', 'hot-sale');
    if (!existsSync(dir)) return { imageUrl: '' };
    const file = readdirSync(dir)
      .filter((name) => /^hot-sale\./.test(name))
      .map((name) => ({ name, mtime: statSync(join(dir, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)[0];
    return { imageUrl: file ? this.absoluteUrl(`/uploads/hot-sale/${file.name}`) : '' };
  }

  private withAbsoluteImage(product: ProductEntity) {
    return {
      ...product,
      coverUrl: this.absoluteUrl(product.coverUrl),
      images: product.images?.map((url) => this.absoluteUrl(url) || url),
    };
  }

  private absoluteUrl(url?: string) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000';
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
  }
}
