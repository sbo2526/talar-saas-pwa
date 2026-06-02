"use server";

import type { CustomerActionState } from "@/lib/actions/customer-state";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";
import { customerFormSchema, customerIdSchema } from "@/lib/validation/customer";
import { buildCustomerNotificationVariables } from "@/lib/notifications/event-variables";
import { dispatchOwnerNotification } from "@/lib/notifications/owner-notification-dispatcher";
import { dispatchCustomerSmsNotification } from "@/lib/notifications/customer-notification-dispatcher";
import { auditCreate, auditToggle, auditUpdate } from "@/lib/audit/audit-action-helpers";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";

async function fetchCustomerForNotification(
  db: Awaited<ReturnType<typeof getPrisma>>,
  tenantId: string,
  customerId: string,
) {
  return db.customer.findFirst({
    where: { id: customerId, tenantId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      nationalCode: true,
      nationalId: true,
    },
  });
}

async function dispatchCustomerTelegramNotificationSafely(input: {
  db: Awaited<ReturnType<typeof getPrisma>>;
  tenantId: string;
  tenant: { name?: string | null };
  customerId: string;
  eventType: "CUSTOMER_CREATED" | "CUSTOMER_UPDATED";
  actorName?: string;
}) {
  try {
    const customer = await fetchCustomerForNotification(input.db, input.tenantId, input.customerId);

    if (!customer) {
      return;
    }

    const variables = {
      ...buildCustomerNotificationVariables(customer, input.tenant),
      operatorName: input.actorName ?? "سامانه",
      userName: input.actorName ?? "سامانه",
    };

    await dispatchOwnerNotification({
      tenantId: input.tenantId,
      eventType: input.eventType,
      variables,
      relatedCustomerId: customer.id,
    });

    if (input.eventType === "CUSTOMER_CREATED") {
      await dispatchCustomerSmsNotification({
        tenantId: input.tenantId,
        eventType: "CUSTOMER_CREATED",
        customerMobile: customer.phone,
        customerName: customer.fullName,
        variables,
        relatedCustomerId: customer.id,
      });
    }
  } catch {
    // اعلان مدیریتی best-effort است و نباید عملیات اصلی مشتری را شکست دهد.
  }
}

function parseCustomerForm(formData: FormData) {
  return customerFormSchema.safeParse({
    customerId: formData.get("customerId"),
    salutation: formData.get("salutation"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    nationalCode: formData.get("nationalCode"),
    address: formData.get("address"),
    notes: formData.get("notes"),
    isActive: formData.get("isActive"),
  });
}

function revalidateCustomerPaths(customerId?: string) {
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/contracts/new");

  if (customerId) {
    revalidatePath(`/dashboard/customers/${customerId}`);
  }
}

function getCustomerErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "DUPLICATE_PHONE") {
      return "مشتری دیگری با این شماره همراه در فضای کاری شما ثبت شده است.";
    }

    if (error.message === "DUPLICATE_NATIONAL_CODE") {
      return "مشتری دیگری با این کد ملی در فضای کاری شما ثبت شده است.";
    }

    if (error.message === "CUSTOMER_NOT_FOUND") {
      return "مشتری مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.";
    }
  }

  return "ذخیره اطلاعات مشتری با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
}

async function assertUniqueCustomerIdentity(
  tenantId: string,
  phone: string,
  nationalCode: string | undefined,
  exceptCustomerId?: string,
) {
  const db = await getPrisma();

  const phoneOwner = await db.customer.findFirst({
    where: {
      tenantId,
      phone,
      ...(exceptCustomerId ? { NOT: { id: exceptCustomerId } } : {}),
    },
    select: { id: true },
  });

  if (phoneOwner) {
    throw new Error("DUPLICATE_PHONE");
  }

  if (!nationalCode) {
    return;
  }

  const nationalCodeOwner = await db.customer.findFirst({
    where: {
      tenantId,
      OR: [{ nationalCode }, { nationalId: nationalCode }],
      ...(exceptCustomerId ? { NOT: { id: exceptCustomerId } } : {}),
    },
    select: { id: true },
  });

  if (nationalCodeOwner) {
    throw new Error("DUPLICATE_NATIONAL_CODE");
  }
}

export async function createCustomerAction(
  _previousState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const membership = await requireTenantPermission("customers.create");
  const parsed = parseCustomerForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "اطلاعات مشتری معتبر نیست.",
    };
  }

  const db = await getPrisma();
  let customerId = "";

  try {
    await assertUniqueCustomerIdentity(
      membership.tenantId,
      parsed.data.phone,
      parsed.data.nationalCode,
    );

    const customer = await db.customer.create({
      data: {
        tenantId: membership.tenantId,
        salutation: parsed.data.salutation,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        nationalCode: parsed.data.nationalCode,
        nationalId: parsed.data.nationalCode,
        address: parsed.data.address,
        notes: parsed.data.notes,
        isActive: parsed.data.isActive,
      },
    });
    customerId = customer.id;

    await auditCreate({
      membership,
      entityType: "CUSTOMER",
      entityLabel: "مشتری",
      entityId: customer.id,
      recordLabel: customer.fullName,
      title: "ثبت مشتری",
      afterData: customer,
      href: `/dashboard/customers/${customer.id}`,
    });
  } catch (error) {
    return { ok: false, message: getCustomerErrorMessage(error) };
  }

  await dispatchCustomerTelegramNotificationSafely({
    db,
    tenantId: membership.tenantId,
    tenant: membership.tenant,
    customerId,
    actorName: getAuditActorName(membership.user),
    eventType: "CUSTOMER_CREATED",
  });

  revalidateCustomerPaths(customerId);
  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");
  redirect(`/dashboard/customers/${customerId}?created=1`);
}

export async function updateCustomerAction(
  _previousState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const membership = await requireTenantPermission("customers.edit");
  const parsed = parseCustomerForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "اطلاعات مشتری معتبر نیست.",
    };
  }

  if (!parsed.data.customerId) {
    return { ok: false, message: "شناسه مشتری معتبر نیست." };
  }

  const db = await getPrisma();

  try {
    await assertUniqueCustomerIdentity(
      membership.tenantId,
      parsed.data.phone,
      parsed.data.nationalCode,
      parsed.data.customerId,
    );

    const current = await db.customer.findFirst({
      where: { id: parsed.data.customerId, tenantId: membership.tenantId },
    });

    if (!current) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    const updated = await db.customer.update({
      where: { id: current.id },
      data: {
        salutation: parsed.data.salutation,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        nationalCode: parsed.data.nationalCode,
        nationalId: parsed.data.nationalCode,
        address: parsed.data.address,
        notes: parsed.data.notes,
        isActive: parsed.data.isActive,
      },
    });

    await auditUpdate({
      membership,
      entityType: "CUSTOMER",
      entityLabel: "مشتری",
      entityId: updated.id,
      recordLabel: updated.fullName,
      title: "ویرایش مشتری",
      beforeData: current,
      afterData: updated,
      href: `/dashboard/customers/${updated.id}`,
    });
  } catch (error) {
    return { ok: false, message: getCustomerErrorMessage(error) };
  }

  await dispatchCustomerTelegramNotificationSafely({
    db,
    tenantId: membership.tenantId,
    tenant: membership.tenant,
    customerId: parsed.data.customerId,
    actorName: getAuditActorName(membership.user),
    eventType: "CUSTOMER_UPDATED",
  });

  revalidateCustomerPaths(parsed.data.customerId);
  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");
  redirect(`/dashboard/customers/${parsed.data.customerId}?updated=1`);
}

export async function toggleCustomerStatusAction(formData: FormData) {
  const membership = await requireTenantPermission("customers.edit");
  const parsed = customerIdSchema.safeParse({ customerId: formData.get("customerId") });
  const isActive = formData.get("isActive") === "true";
  const returnToRaw = String(formData.get("returnTo") ?? "/dashboard/customers");
  const returnTo = returnToRaw.startsWith("/dashboard/customers")
    ? returnToRaw
    : "/dashboard/customers";

  if (!parsed.success) {
    redirect(`${returnTo}?customerError=invalid`);
  }

  const db = await getPrisma();
  const current = await db.customer.findFirst({
    where: { id: parsed.data.customerId, tenantId: membership.tenantId },
  });

  if (!current) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}customerError=not-found`);
  }

  const updated = await db.customer.update({
    where: { id: current.id },
    data: { isActive },
  });

  await auditToggle({
    membership,
    entityType: "CUSTOMER",
    entityLabel: "مشتری",
    entityId: updated.id,
    recordLabel: updated.fullName,
    title: isActive ? "فعال‌سازی مشتری" : "غیرفعال‌سازی مشتری",
    isActive,
    beforeData: current,
    afterData: updated,
    href: `/dashboard/customers/${updated.id}`,
  });

  revalidateCustomerPaths(parsed.data.customerId);
  revalidatePath("/dashboard/settings/activity");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}statusUpdated=1`);
}


export async function deleteCustomerAction(input: FormData | string) {
  const membership = await requireTenantPermission("customers.delete");
  const customerId = typeof input === "string" ? input : input.get("customerId");
  const returnToRaw = typeof input === "string" ? "/dashboard/customers" : String(input.get("returnTo") ?? "/dashboard/customers");
  const parsed = customerIdSchema.safeParse({ customerId });
  const returnTo = returnToRaw.startsWith("/dashboard/customers") ? returnToRaw : "/dashboard/customers";

  if (!parsed.success) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}customerError=invalid`);
  }

  const db = await getPrisma();
  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, tenantId: membership.tenantId },
    include: { _count: { select: { contracts: true } } },
  });

  if (!customer) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}customerError=not-found`);
  }

  if (customer._count.contracts > 0) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}customerError=has-contracts`);
  }

  await db.customer.delete({ where: { id: customer.id } });

  await createAuditLog({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "DELETE",
    entityType: "CUSTOMER",
    entityId: customer.id,
    title: "حذف مشتری",
    message: `مشتری «${customer.fullName}» توسط ${getAuditActorName(membership.user)} حذف شد.`,
    beforeData: customer,
    href: "/dashboard/customers",
  });

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/settings/activity");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}deleted=1`);
}
