import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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

  private withAbsoluteImage(product: ProductEntity) {
    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000';
    const normalize = (url?: string) => {
      if (!url) return url;
      if (/^https?:\/\//i.test(url)) return url;
      return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
    };
    return {
      ...product,
      coverUrl: normalize(product.coverUrl),
      images: product.images?.map((url) => normalize(url) || url),
    };
  }
}
