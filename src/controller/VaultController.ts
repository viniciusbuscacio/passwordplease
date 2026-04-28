'use strict';

import { ICryptoProvider } from '../domain/interfaces/ICryptoProvider';
import { IStorageProvider } from '../domain/interfaces/IStorageProvider';
import { Secret } from '../domain/entities/Secret';
import { Category } from '../domain/entities/Category';
import { CreateVault } from '../usecases/CreateVault';
import { UnlockVault } from '../usecases/UnlockVault';
import { GetSecret } from '../usecases/GetSecret';
import { SetSecret, SetSecretData } from '../usecases/SetSecret';
import { ListSecrets, ListedSecret } from '../usecases/ListSecrets';
import { DeleteSecret } from '../usecases/DeleteSecret';
import { ChangeMasterPassword } from '../usecases/ChangeMasterPassword';
import { ExportVault, ExportResult } from '../usecases/ExportVault';
import { ManageCategories } from '../usecases/ManageCategories';

export class VaultController {
  private crypto: ICryptoProvider;
  private storage: IStorageProvider;
  private mountKey: string | null = null;

  private _createVault: CreateVault;
  private _unlockVault: UnlockVault;
  private _getSecret: GetSecret;
  private _setSecret: SetSecret;
  private _listSecrets: ListSecrets;
  private _deleteSecret: DeleteSecret;
  private _changeMasterPassword: ChangeMasterPassword;
  private _exportVault: ExportVault;
  private _manageCategories: ManageCategories;

  constructor(cp: ICryptoProvider, sp: IStorageProvider) {
    this.crypto = cp;
    this.storage = sp;
    this._createVault = new CreateVault(cp, sp);
    this._unlockVault = new UnlockVault(cp, sp);
    this._getSecret = new GetSecret(cp, sp);
    this._setSecret = new SetSecret(cp, sp);
    this._listSecrets = new ListSecrets(cp, sp);
    this._deleteSecret = new DeleteSecret(cp, sp);
    this._changeMasterPassword = new ChangeMasterPassword(cp, sp);
    this._exportVault = new ExportVault(cp, sp);
    this._manageCategories = new ManageCategories(cp, sp);
  }

  isUnlocked(): boolean {
    return this.mountKey !== null;
  }

  async create(dbPath: string, mp: string): Promise<void> {
    await this.storage.init(dbPath);
    this.mountKey = await this._createVault.execute(mp);
  }

  async unlock(dbPath: string, mp: string): Promise<void> {
    await this.storage.init(dbPath);
    this.mountKey = await this._unlockVault.execute(mp);
  }

  async lock(): Promise<void> {
    this.mountKey = null;
    await this.storage.close();
  }

  // Secrets
  async get(title: string, field?: string): Promise<Secret | string | null> {
    const s = await this._getSecret.execute(title, this.mountKey);
    return field ? ((s as any)[field] || null) : s;
  }

  async set(data: SetSecretData, existingId?: string): Promise<void> {
    await this._setSecret.execute(data, this.mountKey, existingId);
  }

  async list(): Promise<ListedSecret[]> {
    return this._listSecrets.execute(this.mountKey);
  }

  async delete(id: string): Promise<void> {
    await this._deleteSecret.execute(id, this.mountKey);
  }

  // Master password
  async changeMasterPassword(currentPassword: string, newPassword: string): Promise<void> {
    await this._changeMasterPassword.execute(currentPassword, newPassword, this.mountKey);
  }

  // Export
  async export(): Promise<ExportResult> {
    return this._exportVault.execute(this.mountKey);
  }

  // Categories
  async listCategories(): Promise<Category[]> {
    return this._manageCategories.list(this.mountKey);
  }

  async addCategory(name: string): Promise<Category> {
    return this._manageCategories.add(name, this.mountKey);
  }

  async updateCategory(id: string, newName: string): Promise<void> {
    return this._manageCategories.update(id, newName, this.mountKey);
  }

  async deleteCategory(id: string): Promise<void> {
    return this._manageCategories.delete(id, this.mountKey);
  }
}
