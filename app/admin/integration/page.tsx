import type { Metadata } from "next";
import { IntegrationPortalView } from "@/components/integration/integration-portal-view";

export const metadata: Metadata = {
  title: "Integration Guide & API Reference | Admin Dashboard",
  description:
    "Enterprise developer integration guide, automated coin sync webhooks, player token authentication, and mobile SDK snippets for Flutter, React Native, Android, and iOS.",
};

export default function AdminIntegrationPage() {
  return <IntegrationPortalView />;
}
