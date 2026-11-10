import { createFileRoute } from "@tanstack/react-router";
import { KathaWorkspace } from "@/components/katha/KathaWorkspace";
export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Settings — Katha Studio" }, { name: "description", content: "Configure Katha Studio's provider connections and local workspace." },
    { property: "og:title", content: "Settings — Katha Studio" }, { property: "og:description", content: "Configure Katha Studio's provider connections and local workspace." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: () => <KathaWorkspace page="settings" />,
});
