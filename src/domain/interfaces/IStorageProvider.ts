'use strict';

import { VaultMetadataData } from '../entities/VaultMetadata';

export interface SecretRecord {
  id: string;
  title: string;
  username: string | null;
  password: string | null;
  url: string | null;
  notes: string | null;
  categoryId: string | null;
  category_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
}

export interface MetadataRecord {
  mount_key_ciphered: string;
  master_password_hash: string;
  salt: string;
  created_at: string;
  version: string;
}

export interface MetadataUpdate {
  mountKeyCiphered: string;
  masterPasswordHash: string;
  salt: string;
}

export interface IStorageProvider {
  init(dbPath: string): Promise<void>;
  close(): Promise<void>;
  createTables(metadata: VaultMetadataData): Promise<void>;
  getMetadata(): Promise<{ mountKeyCiphered: string; masterPasswordHash: string; salt: string; createdAt: string; version: string } | null>;
  updateMetadata(metadata: MetadataUpdate): Promise<void>;
  insertSecret(record: SecretRecord): Promise<void>;
  getSecretById(id: string): Promise<SecretRecord | null>;
  getAllSecrets(): Promise<SecretRecord[]>;
  updateSecret(id: string, record: Partial<SecretRecord>): Promise<void>;
  deleteSecret(id: string): Promise<void>;
  insertCategory(record: CategoryRecord): Promise<void>;
  getAllCategories(): Promise<CategoryRecord[]>;
  updateCategory(id: string, record: Partial<CategoryRecord>): Promise<void>;
  deleteCategory(id: string): Promise<void>;
}
