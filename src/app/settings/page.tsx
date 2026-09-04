import { SettingsForm } from "@/components/SettingsForm";
import { PageHeader } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6 lg:px-8">
      <PageHeader title="Settings" subtitle="Defaults for analysis, captions and export." />
      <SettingsForm />
    </div>
  );
}
