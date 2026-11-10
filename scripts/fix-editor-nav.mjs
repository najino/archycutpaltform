import fs from "node:fs";

const files = [
  "apps/web/app/earnings/page.tsx",
  "apps/web/app/invoices/page.tsx",
  "apps/web/app/portfolio/page.tsx",
  "apps/web/app/tasks/[id]/page.tsx",
];

for (const file of files) {
  let c = fs.readFileSync(file, "utf8");
  c = c.replace(
    'import { Nav } from "@/components/nav";',
    'import { EditorNav } from "@/components/editor-nav";\nimport { requireEditorPortal } from "@/lib/authz";',
  );
  c = c.replace(/<Nav user=\{user\} \/>/g, "<EditorNav user={user} />");
  // Prefer portal guard when page starts with getSessionUser check
  if (
    c.includes("const user = await getSessionUser();") &&
    !c.includes("requireEditorPortal")
  ) {
    c = c.replace(
      /const user = await getSessionUser\(\);\s*if \(!user\) redirect\("\/login"\);/,
      "const user = await requireEditorPortal();",
    );
  }
  fs.writeFileSync(file, c);
  console.log("fixed", file);
}
