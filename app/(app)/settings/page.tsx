import { AccessibilitySettings } from "@/components/settings/accessibility-settings";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        badges={<Badge variant="secondary">Settings</Badge>}
        heading={<h1 className="page-title">Settings</h1>}
        description={
          <p>
            Personalize how the app looks and feels. Accessibility preferences save on this device and apply everywhere, including the debate room.
          </p>
        }
      />

      <AccessibilitySettings />
    </div>
  );
}
