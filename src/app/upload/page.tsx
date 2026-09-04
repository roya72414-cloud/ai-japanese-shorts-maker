import { UploadWorkspace } from "@/components/UploadWorkspace";
import { PageHeader } from "@/components/ui";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
      <PageHeader title="Upload Video" subtitle="Step 1 — add a long Japanese lesson. Static-image lessons and burned-in subtitles are fully supported." />
      <UploadWorkspace />
    </div>
  );
}
