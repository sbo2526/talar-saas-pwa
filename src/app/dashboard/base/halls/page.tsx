import { redirect } from "next/navigation";

export default function BaseHallsRedirectPage() {
  redirect("/dashboard/halls");
}
