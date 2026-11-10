import { createFileRoute } from "@tanstack/react-router";
import { KathaWorkspace } from "@/components/katha/KathaWorkspace";
export const Route = createFileRoute("/create")({
  head: () => ({ meta: [
    { title: "Create a Story — Katha Studio" }, { name: "description", content: "Start a Katha production with your written or recorded story." },
    { property: "og:title", content: "Create a Story — Katha Studio" }, { property: "og:description", content: "Start a Katha production with your written or recorded story." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: () => <KathaWorkspace page="create" />,
});
