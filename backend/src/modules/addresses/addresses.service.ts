import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddressEntity } from '../../database/entities';

@Injectable()
export class AddressesService {
  constructor(@InjectRepository(AddressEntity) private readonly addresses: Repository<AddressEntity>) {}

  list(userId: string) {
    return this.addresses.find({ where: { userId }, order: { isDefault: 'DESC', id: 'DESC' } });
  }

  async create(userId: string, dto: Partial<AddressEntity>) {
    if (dto.isDefault) await this.addresses.update({ userId }, { isDefault: false });
    return this.addresses.save({ ...dto, userId });
  }

  async update(userId: string, id: string, dto: Partial<AddressEntity>) {
    if (dto.isDefault) await this.addresses.update({ userId }, { isDefault: false });
    await this.addresses.update({ id, userId }, dto);
    return this.addresses.findOneBy({ id, userId });
  }

  async remove(userId: string, id: string) {
    await this.addresses.delete({ id, userId });
    return { ok: true };
  }
}

