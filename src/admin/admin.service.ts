import { Injectable, Logger } from '@nestjs/common';
import {
  HypePermission,
  HypeRole,
  RolePermissions,
  User,
  UserRoles,
  UserStatusEnum,
  UserStatusType,
} from '../entity';
import { InjectModel } from '@nestjs/sequelize';
import { ApplicationService } from '../application/application.service';
import { UserService } from '../user/user.service';
import { FormRecordService } from '../form/providers/form-record.service';
import { FormService } from '../form/providers/form.service';
import { FormRecordStateEnum } from '../entity/HypeBaseForm';

@Injectable()
export class AdminService {
  constructor(
    private userService: UserService,
    private formService: FormService,
    private formDataService: FormRecordService,
    private applicationService: ApplicationService,
    @InjectModel(HypeRole)
    private roleModel: typeof HypeRole,
    @InjectModel(HypePermission)
    private permissionModel: typeof HypePermission,
    @InjectModel(UserRoles)
    private userRolesModel: typeof UserRoles,
    @InjectModel(RolePermissions)
    private rolePermissionModel: typeof RolePermissions,
  ) {}

  async onModuleInit() {
    const user = await this.userService.findOne({
      id: 1,
    });
    await this.initProject(user);
  }

  async getRole(id: number): Promise<HypeRole> {
    return this.roleModel.findOne({
      where: {
        id,
      },
      include: [HypePermission],
    });
  }

  async creatRole(data: Partial<HypeRole>): Promise<HypeRole> {
    return await this.roleModel.create(data);
  }

  async createUser(
    byUser: User,
    payload: {
      username: string;
      email: string;
      password: string;
      status: UserStatusType;
    },
  ): Promise<any> {
    const { username, email, password, status } = payload;
    const hash = await this.userService.hashPassword(password);
    return await this.userService.createUser({
      passwordHash: hash,
      username: username,
      email: email,
      status: status ?? UserStatusEnum.active,
    });
  }

  async createPermission(
    data: Partial<HypePermission>,
  ): Promise<HypePermission> {
    return await this.permissionModel.create(data);
  }

  async deletePermission(
    user: User,
    where: Partial<HypePermission>,
  ): Promise<[affectedCount: number]> {
    return this.permissionModel.update(
      {
        deletedAt: new Date(),
        deletedBy: user.id,
      },
      {
        where,
      },
    );
  }

  async deleteRole(
    user: User,
    where: Partial<HypeRole>,
  ): Promise<[affectedCount: number]> {
    return this.roleModel.update(
      {
        deletedAt: new Date(),
        deletedBy: user.id,
      },
      { where },
    );
  }

  async getAssignRole(userId: number): Promise<Array<UserRoles>> {
    return await this.userRolesModel.findAll({
      where: { userId },
    });
  }

  async applyUserRoles(
    byUser: User,
    userId: number,
    roleToApply: { id: number; val: boolean }[],
  ) {
    const forAdd = [];
    const forRemove = [];
    const existRoles = await this.userRolesModel.findAll({
      where: {
        userId,
        deletedAt: null,
      },
    });

    for (const r of roleToApply.filter((r) => r.val === true)) {
      if (existRoles.find((er) => er.roleId == r.id) == null) {
        forAdd.push({
          roleId: r.id,
          createdBy: byUser.id,
          userId: userId,
        });
      }
    }

    for (const r of roleToApply.filter((r) => r.val === false)) {
      if (existRoles.find((er) => er.roleId == r.id) != null) {
        forRemove.push(r.id);
      }
    }

    const removed = await this.userRolesModel.update(
      {
        deletedAt: new Date(),
        deletedBy: byUser.id,
      },
      {
        where: {
          roleId: forRemove,
          userId: userId,
        },
      },
    );
    const added = await this.userRolesModel.bulkCreate(forAdd);
    return { added, removed };
  }

  async applyRolePermission(
    byUser: User,
    roleId: number,
    permissionToApply: { id; val }[],
  ) {
    const forAdd = [];
    const forRemove = [];
    const existPermission = await this.rolePermissionModel.findAll({
      where: {
        roleId,
        deletedAt: null,
      },
    });

    for (const pa of permissionToApply.filter((p) => p.val === true)) {
      if (existPermission.find((rp) => rp.permissionId == pa.id) == null) {
        forAdd.push({
          permissionId: pa.id,
          createdBy: byUser.id,
          roleId: roleId,
        });
      }
    }

    for (const pa of permissionToApply.filter((p) => p.val === false)) {
      if (existPermission.find((rp) => rp.permissionId == pa.id) != null) {
        forRemove.push(pa.id);
      }
    }

    const removed = await this.rolePermissionModel.update(
      {
        deletedAt: new Date(),
        deletedBy: byUser.id,
      },
      {
        where: {
          permissionId: forRemove,
          roleId: roleId,
        },
      },
    );

    const added = await this.rolePermissionModel.bulkCreate(forAdd);
    return { added, removed };
  }

  async initProject(initUser: User) {
    const settingForm = await this.formService.getFormOnly({
      slug: 'app_setting',
      state: FormRecordStateEnum.ACTIVE,
    });
    Logger.log(`settingForm exist ${settingForm != null}`);
    if (settingForm != null) return;
    Logger.log(`start initProject`);
    const { form } = await this.formService.createForm(initUser, {
      name: 'App Setting',
      slug: 'app_setting',
    });
    await this.formService.addFormField(
      initUser,
      form.id,
      'string',
      'text-input',
      'appname',
      'appName',
    );

    await this.formService.addFormField(
      initUser,
      form.id,
      'string',
      'text-input',
      'organizename',
      'organizeName',
    );

    await this.formService.addFormField(
      initUser,
      form.id,
      'string',
      'text-input',
      'email',
      'email',
    );

    await this.formService.addFormField(
      initUser,
      form.id,
      'string',
      'file-input',
      'appicon',
      'appIcon',
    );

    await this.formService.addFormField(
      initUser,
      form.id,
      'string',
      'text-input',
      'login_title',
      'loginTitle',
    );

    await this.formService.addFormField(
      initUser,
      form.id,
      'string',
      'text-input',
      'login_sub_title',
      'loginSubTitle',
    );

    await this.formService.addFormField(
      initUser,
      form.id,
      'string',
      'file-input',
      'login_image',
      'loginImage',
    );
  }
}
