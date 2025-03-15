import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { FormRecordStateType } from '../../entity/HypeBaseForm';

export class CreateFormRecordDto {
  data: any;
  @IsOptional()
  recordState?: FormRecordStateType;
}
export class UpdateFormRecordRequest {
  data: any;
  deleteFiles: any;
  recordState: FormRecordStateType;
}

export class FormRecordDto {}

export class FormRecordListQuery {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  perPage?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsString()
  @IsOptional()
  format?: string;

  @IsArray()
  @IsOptional()
  selects?: string[];

  [key: string]: any;
}
