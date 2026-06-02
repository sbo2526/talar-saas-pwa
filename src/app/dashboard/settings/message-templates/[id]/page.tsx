import { notFound } from "next/navigation";
import {
  BackToSettingsLink,
  SettingsPageShell,
  SettingsSecondaryLink,
} from "@/components/dashboard/settings/settings-page-shell";
import { NotificationTemplateEditor } from "@/components/dashboard/settings/notification-template-editor";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDateTime } from "@/lib/date/jalali";
import {
  getNotificationChannelLabel,
  getNotificationEventLabel,
} from "@/lib/notifications/constants";
import { getNotificationTemplateById } from "@/lib/notifications/data";
import { ensureDefaultNotificationTemplates } from "@/lib/notifications/notification-service";
import { messageTemplateVariables } from "@/lib/settings-hub";

type TemplateEditPageProps = {
  params: Promise<{ id: string }>;
};

type TemplateRow = {
  id: string;
  channel: string;
  eventType: string;
  title: string;
  body: string;
  isEnabled: boolean;
  updatedAt: Date;
};

export default async function TemplateEditPage({ params }: TemplateEditPageProps) {
  const membership = await requireTenantMember();
  const { id } = await params;
  await ensureDefaultNotificationTemplates(membership.tenantId);
  const template = (await getNotificationTemplateById(membership.tenantId, id)) as TemplateRow | null;

  if (!template) {
    notFound();
  }

  return (
    <SettingsPageShell
      title="ویرایش قالب پیام"
      subtitle={`${getNotificationChannelLabel(template.channel)} · ${getNotificationEventLabel(template.eventType)} · آخرین ویرایش ${formatJalaliDateTime(template.updatedAt)}`}
      badge="مدیریت قالب"
      tenantName={membership.tenant.name}
      actions={
        <>
          <SettingsSecondaryLink href="/dashboard/settings/message-templates">
            بازگشت به قالب‌ها
          </SettingsSecondaryLink>
          <BackToSettingsLink />
        </>
      }
    >
      <NotificationTemplateEditor template={template} variables={messageTemplateVariables} />
    </SettingsPageShell>
  );
}
