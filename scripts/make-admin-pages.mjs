import fs from "node:fs";
import path from "node:path";

const base = "apps/web/app";

function transform(srcRel, destRel, replacements) {
  const src = path.join(base, srcRel);
  const dest = path.join(base, destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let c = fs.readFileSync(src, "utf8");
  c = c.replace(/import \{ Nav \} from "@\/components\/nav";\r?\n/, "");
  c = c.replace(
    /import \{ RealtimeRefetch \} from "@\/components\/realtime-refetch";\r?\n/,
    "",
  );
  c = c.replace(
    /<div className="app-shell">\s*(?:<RealtimeRefetch \/>\s*)?<Nav user=\{user\} \/>\s*/,
    "<>\n      ",
  );
  if (c.includes("<>")) {
    const idx = c.lastIndexOf("</div>");
    if (idx !== -1) c = c.slice(0, idx) + "</>" + c.slice(idx + 6);
  }
  for (const [a, b] of Object.entries(replacements)) {
    c = c.split(a).join(b);
  }
  fs.writeFileSync(dest, c);
  console.log("wrote", dest);
}

transform("projects/page.tsx", "admin/projects/page.tsx", {
  'redirect("/projects")': 'redirect("/admin/projects")',
  'redirect("/login")': 'redirect("/login?portal=admin")',
  'redirect("/week")': 'redirect("/admin")',
});

transform("settings/page.tsx", "admin/settings/page.tsx", {
  'redirect("/settings")': 'redirect("/admin/settings")',
  "redirect(`/settings?": "redirect(`/admin/settings?",
  'redirect("/login")': 'redirect("/login?portal=admin")',
  'redirect("/week")': 'redirect("/admin")',
});

transform("earnings/page.tsx", "admin/earnings/page.tsx", {
  'redirect("/login")': 'redirect("/login?portal=admin")',
});

transform("invoices/page.tsx", "admin/invoices/page.tsx", {
  'redirect("/invoices")': 'redirect("/admin/invoices")',
  "redirect(`/invoices?": "redirect(`/admin/invoices?",
  "href={`/invoices/": "href={`/admin/invoices/",
  'redirect("/login")': 'redirect("/login?portal=admin")',
});

transform("portfolio/page.tsx", "admin/portfolio/page.tsx", {
  'redirect("/login")': 'redirect("/login?portal=admin")',
});

transform("tasks/[id]/page.tsx", "admin/tasks/[id]/page.tsx", {
  "redirect(`/tasks/": "redirect(`/admin/tasks/",
  'href="/week"': 'href="/admin/board"',
  'redirect("/login")': 'redirect("/login?portal=admin")',
  'redirect("/week")': 'redirect("/admin")',
});
