import { LayoutModeShell } from "@/components/layout-mode-shell";

type EditPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditLayoutPage({ params, searchParams }: EditPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const workspaceToken = query.workspace;
  const manageSectionToken = query.manageSection;
  const manageDatabaseToken = query.manageDatabase;
  const workspaceId =
    typeof workspaceToken === "string"
      ? workspaceToken
      : Array.isArray(workspaceToken)
        ? workspaceToken[0]
        : undefined;
  const initialManageSection =
    typeof manageSectionToken === "string"
      ? manageSectionToken
      : Array.isArray(manageSectionToken)
        ? manageSectionToken[0]
        : undefined;
  const initialManageDatabaseOpenToken =
    typeof manageDatabaseToken === "string"
      ? manageDatabaseToken
      : Array.isArray(manageDatabaseToken)
        ? manageDatabaseToken[0]
        : "";
  const initialManageDatabaseOpen = /^(1|true|yes)$/i.test(initialManageDatabaseOpenToken);
  return (
    <LayoutModeShell
      layoutId={id}
      workspaceId={workspaceId}
      initialManageSection={initialManageSection}
      initialManageDatabaseOpen={initialManageDatabaseOpen}
    />
  );
}
