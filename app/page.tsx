import { redirect } from "next/navigation";
import { DEFAULT_ACTIVE_LAYOUT_NAME } from "@/src/lib/default-layout-context";

export default function Home() {
  redirect(`/layouts/${encodeURIComponent(DEFAULT_ACTIVE_LAYOUT_NAME)}/edit?workspace=assets`);
}
