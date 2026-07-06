/**
 * Re-mounts on every route change (unlike layout), so each page gets
 * the enter animation — layout's static wrapper only played on first load.
 * page-stagger cascades every top-level block of the page in sequence.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-stagger">{children}</div>;
}
