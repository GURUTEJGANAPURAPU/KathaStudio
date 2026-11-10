import { createFileRoute } from "@tanstack/react-router";
import { KathaWorkspace } from "@/components/katha/KathaWorkspace";
export const Route = createFileRoute("/published")({
  head: () => ({ meta: [
    { title: "Published Productions — Katha Studio" }, { name: "description", content: "Listen to your published Katha Studio audio productions." },
    { property: "og:title", content: "Published Productions — Katha Studio" }, { property: "og:description", content: "Listen to your published Katha Studio audio productions." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: () => <KathaWorkspace page="published" />,
});
