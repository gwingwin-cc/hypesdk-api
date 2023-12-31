import {
  FormLayoutRequireCheckModeEnum,
  PermissionGrantType,
} from '../../entity';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateFormDto {}
export class UpdateFormDto {}
export class FormDto {}

export class UpdaterFormPermissionDto {
  permissions: Array<{
    id: number;
    val: boolean;
    grant: PermissionGrantType;
  }>;
}

export class CreateFormRequest {
  @IsString()
  name: string;
  @IsString()
  slug: string;
}

export class AddFormFieldRequest {
  @IsString()
  name: string;
  @IsString()
  slug: string;
  @IsString()
  fieldType: string;
  @IsString()
  componentTemplate: string;
}

export class UpdateFormScriptRequest {
  @IsString()
  name: string;
  @IsString()
  desc: string;
  @IsString()
  scripts: string;
}

export class UpdateFormLayoutRequest {
  @IsString()
  layout: string;
  @IsString()
  @IsOptional()
  script?: string;
  @IsObject()
  @IsOptional()
  options?: object | any;
  @IsArray()
  @IsOptional()
  approval?: Array<any>;
  @IsBoolean()
  @IsOptional()
  enableDraftMode?: 0 | 1 | boolean;
  @IsString()
  @IsOptional()
  requireCheckMode: FormLayoutRequireCheckModeEnum;
}

export class UpdateFieldRequest {
  @IsString()
  name: string;
}

export class AddFormRelationRequest {
  @IsString()
  slug: string;
  @IsNumber()
  targetFormId: number;
  @IsString()
  connectFromField: string;
  @IsString()
  connectToField: string;
}

export class UpdateFormRequest {
  @IsString()
  @IsOptional()
  name?: string;
  @IsString()
  @IsOptional()
  desc?: string;
}
