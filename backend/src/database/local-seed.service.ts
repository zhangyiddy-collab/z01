import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddressEntity, ProductCategory, ProductEntity, ProductStatus, UserEntity } from './entities';

@Injectable()
export class LocalSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(AddressEntity) private readonly addresses: Repository<AddressEntity>,
  ) {}

  async onModuleInit() {
    if (process.env.LOCAL_SEED !== 'true') return;

    const productCount = await this.products.count();
    if (productCount < 50) {
      await this.products.save(this.buildProducts().slice(productCount, 50));
    }

    const user = (await this.users.findOneBy({ openid: 'dev_tester' })) || (await this.users.save({ openid: 'dev_tester', nickname: '测试用户' }));
    if (!(await this.addresses.findOneBy({ userId: user.id }))) {
      await this.addresses.save({
        userId: user.id,
        name: '测试用户',
        phone: '13800000000',
        communityName: '阳光花园',
        buildingNo: '1',
        unitNo: '2',
        roomNo: '301',
        isDefault: true,
      });
    }
  }

  private buildProducts(): Partial<ProductEntity>[] {
    const image = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600';
    const items = [
      { name: 'KS同款鲜切水果杯', category: ProductCategory.FOOD },
      { name: 'KS同款低温鲜奶', category: ProductCategory.DRINK },
      { name: 'KS同款瑞士卷', category: ProductCategory.FOOD },
      { name: 'KS同款每日蔬菜组合', category: ProductCategory.FRESH },
      { name: 'KS同款草莓酸奶', category: ProductCategory.DRINK },
      { name: 'KS同款手撕面包', category: ProductCategory.FOOD },
      { name: 'KS同款鸡胸肉沙拉', category: ProductCategory.FRESH },
      { name: 'KS同款柠檬茶', category: ProductCategory.DRINK },
      { name: 'KS同款抽纸三包装', category: ProductCategory.DAILY },
      { name: 'KS同款洗衣凝珠', category: ProductCategory.DAILY },
      { name: 'KS同款玉米杯', category: ProductCategory.FRESH },
      { name: 'KS同款黑椒牛肉饭', category: ProductCategory.FOOD },
      { name: 'KS同款椰子水', category: ProductCategory.DRINK },
      { name: 'KS同款香蕉一把', category: ProductCategory.FRESH },
      { name: 'KS同款牙刷套装', category: ProductCategory.DAILY },
      { name: 'KS同款无糖气泡水', category: ProductCategory.DRINK },
      { name: 'KS同款番茄鸡蛋便当', category: ProductCategory.FOOD },
      { name: 'KS同款鸡蛋十枚', category: ProductCategory.FRESH },
      { name: 'KS同款湿巾家庭装', category: ProductCategory.DAILY },
      { name: 'KS同款牛油果三枚', category: ProductCategory.FRESH },
      { name: 'KS同款拿铁咖啡', category: ProductCategory.DRINK },
      { name: 'KS同款肉松小贝', category: ProductCategory.FOOD },
      { name: 'KS同款厨房纸巾', category: ProductCategory.DAILY },
      { name: 'KS同款鲜虾云吞', category: ProductCategory.FRESH },
      { name: 'KS同款葡萄汁', category: ProductCategory.DRINK },
      { name: 'KS同款奥尔良鸡腿', category: ProductCategory.FOOD },
      { name: 'KS同款沐浴露', category: ProductCategory.DAILY },
      { name: 'KS同款蓝莓盒装', category: ProductCategory.FRESH },
      { name: 'KS同款酸梅汤', category: ProductCategory.DRINK },
      { name: 'KS同款芝士蛋糕', category: ProductCategory.FOOD },
      { name: 'KS同款保鲜袋', category: ProductCategory.DAILY },
      { name: 'KS同款西兰花', category: ProductCategory.FRESH },
      { name: 'KS同款豆乳饮料', category: ProductCategory.DRINK },
      { name: 'KS同款麻薯面包', category: ProductCategory.FOOD },
      { name: 'KS同款洗手液', category: ProductCategory.DAILY },
      { name: 'KS同款胡萝卜', category: ProductCategory.FRESH },
      { name: 'KS同款矿泉水', category: ProductCategory.DRINK },
      { name: 'KS同款烤鸡翅', category: ProductCategory.FOOD },
      { name: 'KS同款垃圾袋', category: ProductCategory.DAILY },
      { name: 'KS同款蘑菇拼盘', category: ProductCategory.FRESH },
      { name: 'KS同款蜜桃乌龙茶', category: ProductCategory.DRINK },
      { name: 'KS同款牛角包', category: ProductCategory.FOOD },
      { name: 'KS同款洗洁精', category: ProductCategory.DAILY },
      { name: 'KS同款生菜', category: ProductCategory.FRESH },
      { name: 'KS同款绿豆汤', category: ProductCategory.DRINK },
      { name: 'KS同款照烧鸡排饭', category: ProductCategory.FOOD },
      { name: 'KS同款棉柔巾', category: ProductCategory.DAILY },
      { name: 'KS同款小番茄', category: ProductCategory.FRESH },
      { name: 'KS同款燕麦奶', category: ProductCategory.DRINK },
      { name: 'KS同款蛋挞四只装', category: ProductCategory.FOOD },
    ];

    return items.map((item, index) => {
      const productNo = index + 1;
      const price = 690 + (productNo % 16) * 180;
      return {
        ...item,
        subtitle: '本地测试商品',
        coverUrl: image,
        images: [image],
        description: '用于本地小程序测试的商品数据',
        price,
        marketPrice: price + 300,
        stock: 999,
        status: ProductStatus.ON_SALE,
        sort: 100 - productNo,
      };
    });
  }
}
