import { AccessibilitySettings } from "@/components/settings/accessibility-settings";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">Settings</Badge>
        <h1 className="mt-3 text-3xl font-bold">Settings</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Personalize how the app looks and feels. Accessibility preferences save on this device and apply everywhere, including the debate room.
        </p>
      </div>

      <AccessibilitySettings />
    </div>
  );
}
