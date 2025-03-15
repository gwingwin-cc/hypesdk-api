import { BaseEntity } from './BaseEntity';
import { Column, DataType, Table } from 'sequelize-typescript';

export type FormRecordStateType = keyof typeof FormRecordStateEnum;
export enum FormRecordStateEnum {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ACTIVE_LOCK = 'ACTIVE_LOCK',
  CANCEL = 'CANCEL',
  ARCHIVED = 'ARCHIVED',
}
@Table({
  timestamps: true,
  paranoid: true,
  tableName: 'hype_base_form',
})
export class HypeBaseForm extends BaseEntity {
  @Column(DataType.ENUM('DRAFT', 'ACTIVE', 'ACTIVE_LOCK', 'CANCEL', 'ARCHIVED'))
  recordState: FormRecordStateType;

  @Column(DataType.STRING)
  errors: string;

  [key: string]: any;
}
