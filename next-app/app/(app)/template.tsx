/**
 * Re-mounts on every route change (unlike layout), so each page gets
 * the enter animation — layout's static wrapper only played on first load.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-enter">{children}</div>;
}
