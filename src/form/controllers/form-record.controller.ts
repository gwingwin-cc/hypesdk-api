import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Request,
  Response,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import xlsx from 'node-xlsx';
import { InjectModel } from '@nestjs/sequelize';
import { FormLayoutStateEnum, HypeForm, HypeFormField } from '../../entity';
import { FormService } from '../providers/form.service';
import { FormRecordService } from '../providers/form-record.service';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { Permissions } from '../../auth/permission.decorator';
import { PermissionGuard } from '../../auth/guard/permission.guard';
import { TagsService } from '../providers/tags.service';
import {
  CreateFormRecordDto,
  FormRecordDto,
  FormRecordListQuery,
  UpdateFormRecordRequest,
} from '../dto/form-record.dto';
import { HypeRequest } from '../../interfaces/request';
import { HypeAuthGuard } from '../../auth/guard/hype-auth.guard';
import { HypeAnonymousAuthGuard } from '../../auth/guard/hype-anonymous-auth.guard';
import { FormRecordStateEnum } from '../../entity/HypeBaseForm';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BlobStorageService } from '../../blob-storage/blob-storage.service';

@ApiTags('Form - Record')
@Controller('forms')
export class FormRecordController {
  constructor(
    @InjectModel(HypeForm)
    private formModel: typeof HypeForm,
    private formService: FormService,
    private formRecordService: FormRecordService,
    private blobService: BlobStorageService,
    private tagsService: TagsService,
  ) {}

  @UseGuards(HypeAnonymousAuthGuard)
  @Get(':fid/records')
  @ApiBearerAuth()
  async getRecordList(
    @Req() req: HypeRequest,
    @Param('fid') formId: string,
    @Query()
    query: FormRecordListQuery,
  ) {
    let form: HypeForm;
    form = await this.formRecordService.formGrant(formId, null, req.user);
    if (query.includeForm) {
      form = await this.formService.getForm({
        id: form.id,
        layoutState: FormLayoutStateEnum.ACTIVE,
        excludeDeleteField: true,
      });
    }

    if (form == null) {
      throw new Error('Form not found.');
    }

    if (query.recordType == null) {
      query.recordType = 'PROD';
    }
    const where = {};
    where[`${form.slug}.deletedAt`] = null;
    where[`${form.slug}.recordType`] = query.recordType;
    if (query.selects != null) {
    }
    const [data, total] = await Promise.all([
      this.formRecordService.find(form.slug, {
        search: query.search,
        where,
        selects: query.selects,
        columnList: query.selects,
      }),
      this.formRecordService.count(form.slug, where),
    ]);
    return {
      form,
      data,
      total: total[0]['total'],
    };
  }

  @UseGuards(HypeAnonymousAuthGuard)
  @Get(':fid/records/:id')
  async getRecordById(
    @Req() req: HypeRequest,
    @Param('fid') formId: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FormRecordDto> {
    // if formId letter 0 is letter then it is a slug
    const firstLetter = formId[0];
    let form: HypeForm;
    if (/[a-zA-Z]/.test(firstLetter)) {
      form = await this.formModel.findOne({
        where: {
          slug: formId,
        },
        include: [HypeFormField],
      });
    } else {
      form = await this.formModel.findOne({
        where: {
          id: parseInt(formId),
        },
        include: [HypeFormField],
      });
    }

    if (form == null) {
      throw new BadRequestException('Form not found.');
    }

    const granted = await this.formRecordService.validatePermissionGranted(
      form.id,
      id,
      req.user,
      'read',
    );
    if (!granted) {
      throw new BadRequestException('You do not have permission to access.');
    }

    const where = {};
    where[`zz_${form.slug}.deletedAt`] = null;
    const data = await this.formRecordService.findOneById(form.slug, id);
    if (data == null) {
      throw new BadRequestException('Record not found.');
    }
    return {
      ...data,
    };
  }

  @UseGuards(HypeAnonymousAuthGuard)
  @Delete(':formId/records/:id')
  async deleteRecord(
    @Request() req: HypeRequest,
    @Param('formId') formId: number,
    @Param('id') id: number,
  ) {
    const granted = await this.formRecordService.validatePermissionGranted(
      formId,
      id,
      req.user,
      'delete',
    );
    if (!granted) {
      throw new BadRequestException('You do not have permission to access.');
    }
    const user = req.user;
    Logger.log(formId, 'Delete Record');
    await this.formRecordService.deleteRecord(user, formId, id);
  }

  @Get(':formId/records/:rid/files/:field')
  @UseGuards(HypeAnonymousAuthGuard)
  @ApiBearerAuth()
  async viewFile(
    @Request() req,
    @Response() res,
    @Param('fileid') fileId: string,
    @Param('formId', ParseIntPipe) formId: number,
    @Param('rid', ParseIntPipe) rid: number,
  ) {
    if (fileId == '' || fileId == 'undefined') {
      throw new HttpException('id require', HttpStatus.BAD_REQUEST);
    }
    await this.formRecordService.validatePermissionGranted(
      formId,
      rid,
      req.user,
      'read',
    );

    const blobInfo = await this.blobService.getBlob({
      id: parseInt(fileId),
    });
    if (blobInfo == null) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
    res.set({
      'Content-Type': blobInfo.mimetype,
      // 'Cache-Control': 'max-age=3600',
    });
    res.end(blobInfo.blob.bytes);
    // return new StreamableFile(blobInfo.blobData.bytes);
  }

  @UseGuards(HypeAnonymousAuthGuard)
  @Patch(':fid/records/:id/files')
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(204)
  async updateFileToRecord(
    @Request() req: HypeRequest,
    @Param('fid', ParseIntPipe) formId: number,
    @Param('id', ParseIntPipe) recordId: number,
    @Body('fieldName') fieldName: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<void> {
    const form = await this.formModel.findOne({
      where: {
        id: formId,
      },
      include: [HypeFormField],
    });

    if (form == null) {
      throw new BadRequestException('Form not found.');
    }

    const granted = await this.formRecordService.validatePermissionGranted(
      form.id,
      recordId,
      req.user,
      'update',
    );
    if (!granted) {
      throw new BadRequestException(
        'You do not have permission to updateRecord.',
      );
    }
    const user = req.user;
    const latestData = await this.formRecordService.findOneById(
      form.slug,
      recordId,
    );
    let temp = [];
    if (latestData[fieldName] != null) {
      temp = latestData[fieldName];
    }
    for (const f of files) {
      const blobInfo = await this.formRecordService.saveBlob(req.user, f);
      temp.push({
        id: blobInfo.id,
        name: blobInfo.filename,
        size: blobInfo.size,
        mimetype: blobInfo.mimetype,
        createdAt: blobInfo.createdAt,
        storeType: 'blob',
      });
    }
    await this.formRecordService.updateRecord(
      user,
      formId,
      recordId,
      { [fieldName]: temp },
      latestData.recordState,
    );
  }

  @UseGuards(HypeAnonymousAuthGuard)
  @Patch(':fid/records/:id')
  @HttpCode(204)
  async updateRecord(
    @Request() req: HypeRequest,
    @Param('fid', ParseIntPipe) formId: number,
    @Param('id', ParseIntPipe) recordId: number,
    @Body()
    body: UpdateFormRecordRequest,
  ): Promise<void> {
    const form = await this.formModel.findOne({
      where: {
        id: formId,
      },
      include: [HypeFormField],
    });

    if (form == null) {
      throw new BadRequestException('Form not found.');
    }

    const granted = await this.formRecordService.validatePermissionGranted(
      formId,
      recordId,
      req.user,
      'update',
    );
    if (!granted) {
      throw new BadRequestException(
        'You do not have permission to updateRecord.',
      );
    }
    const user = req.user;

    await this.formRecordService.updateRecord(
      user,
      formId,
      recordId,
      body.data,
      body.recordState,
    );

    if (body.deleteFiles != null) {
      Logger.log('Delete Files', 'Update Record');
      Logger.log(body.deleteFiles, 'Update Record');
      const latestData = await this.formRecordService.findOneById(
        form.slug,
        recordId,
      );
      let temp = [];
      const deleteKeys = Object.keys(body.deleteFiles);
      for (const fieldName of deleteKeys) {
        if (latestData[fieldName] != null) {
          temp = latestData[fieldName];
        }
        for (const blobInfoId of body.deleteFiles[fieldName]) {
          temp = temp.filter((b) => b.id != blobInfoId);
        }
        latestData[fieldName] = temp;
      }
      await this.formRecordService.updateRecord(
        user,
        formId,
        recordId,
        latestData,
        latestData.recordState,
      );
    }
  }

  @UseGuards(HypeAnonymousAuthGuard)
  @Post(':fid/records')
  async createRecord(
    @Request() req: HypeRequest,
    @Param('fid') formId: string,
    @Body() body: CreateFormRecordDto,
  ) {
    let form: HypeForm;
    const firstLetter = formId[0];
    if (/[a-zA-Z]/.test(firstLetter)) {
      form = await this.formModel.findOne({
        where: {
          slug: formId,
        },
        include: [HypeFormField],
      });
    } else {
      form = await this.formModel.findOne({
        where: {
          id: parseInt(formId),
        },
        include: [HypeFormField],
      });
    }
    return await this.formRecordService.createRecord(
      req.user,
      form.id,
      body.data,
      body.recordState,
    );
  }

  @Post('import-data')
  @UseGuards(HypeAuthGuard, PermissionGuard)
  @Permissions('form_management')
  @UseInterceptors(FileInterceptor('file'))
  async importData(
    @Request() req: HypeRequest,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    req.headers['content-type'] = 'multipart/form-data';
    const workSheetsFromBuffer: Array<{ data: Array<any> }> = xlsx.parse(
      file.buffer,
    );
    const form = await this.formService.getForm({
      slug: body.formSlug,
      layoutState: FormLayoutStateEnum.ACTIVE,
      excludeDeleteField: true,
    });
    const dataTemplate = [...workSheetsFromBuffer[0].data[0]];
    const dataToSaveArr = [];
    for (let i = 0; i < workSheetsFromBuffer[0].data.length; i++) {
      if (i == 0) {
        continue;
      }
      const r = workSheetsFromBuffer[0].data[i];
      const dataToSave = {};
      for (const cIndex in dataTemplate) {
        if (dataTemplate[cIndex] != 'id') {
          dataToSave[dataTemplate[cIndex]] = r[cIndex];
        }
      }
      dataToSaveArr.push(dataToSave);
    }

    const savedData = [];
    for (const d of dataToSaveArr) {
      const created = await this.formRecordService.saveRecord(
        req.user,
        form.id,
        d,
        FormRecordStateEnum.ACTIVE,
      );
      savedData.push(created);
    }
    return savedData;
  }

  @Get('get-tags-list')
  async getTagsList() {
    return this.tagsService.all();
  }
}
