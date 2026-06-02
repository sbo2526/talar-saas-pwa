import { redirect } from "next/navigation";

export default function BasePackagesRedirectPage() {
  redirect("/dashboard/packages");
}
