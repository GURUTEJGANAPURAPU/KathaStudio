import { createFileRoute } from "@tanstack/react-router";
import { KathaWorkspace } from "@/components/katha/KathaWorkspace";
export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [
    { title: "Audio Studio — Katha Studio" }, { name: "description", content: "Review and arrange audio productions in Katha Studio." },
    { property: "og:title", content: "Audio Studio — Katha Studio" }, { property: "og:description", content: "Review and arrange audio productions in Katha Studio." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: () => <KathaWorkspace page="studio" />,
});
