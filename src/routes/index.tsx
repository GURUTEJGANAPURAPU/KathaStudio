import { createFileRoute } from "@tanstack/react-router";
import { KathaWorkspace } from "@/components/katha/KathaWorkspace";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Katha Studio — Story Production" },
    { name: "description", content: "Write, shape, and produce audio stories in your local Katha Studio workspace." },
    { property: "og:title", content: "Katha Studio — Story Production" },
    { property: "og:description", content: "Write, shape, and produce audio stories in your local Katha Studio workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <KathaWorkspace page="dashboard" />,
});
