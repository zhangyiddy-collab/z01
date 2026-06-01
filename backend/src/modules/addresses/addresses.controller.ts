import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AddressesService } from './addresses.service';

class AddressDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  communityName!: string;

  @IsString()
  buildingNo!: string;

  @IsString()
  unitNo!: string;

  @IsString()
  roomNo!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  list(@CurrentUser() user: CurrentUser) {
    return this.addressesService.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUser, @Body() dto: AddressDto) {
    return this.addressesService.create(user.id, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: CurrentUser, @Param('id') id: string, @Body() dto: AddressDto) {
    return this.addressesService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.addressesService.remove(user.id, id);
  }
}
