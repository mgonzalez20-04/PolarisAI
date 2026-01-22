export interface EmailMessage {
  id: string;
  messageId: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  cc?: string;
  receivedAt: Date;
  bodyPreview?: string;
  bodyText?: string;
  bodyHtml?: string;
  isRead: boolean;
  conversationId?: string;
  categories?: string[];
  folderId?: string;
  folderPath?: string;
}

export interface MailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
}

export interface EmailProvider {
  name: string;
  syncEmails(userId: string, accessToken: string, folderId?: string): Promise<EmailMessage[]>;
  getEmail(messageId: string, accessToken: string): Promise<EmailMessage | null>;
  markAsRead(messageId: string, accessToken: string): Promise<void>;
  deleteEmail(messageId: string, accessToken: string): Promise<void>;
  getFolders(accessToken: string): Promise<MailFolder[]>;
  getChildFolders(folderId: string, accessToken: string): Promise<MailFolder[]>;
}

export interface SyncResult {
  success: boolean;
  emailsSynced: number;
  emailsUpdated?: number;
  foldersSynced?: number;
  error?: string;
}
