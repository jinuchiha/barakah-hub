/**
 * Tiny RFC-4180-ish CSV serializer. We intentionally do NOT pull in a
 * full CSV library — admin exports are a few hundred rows max and the
 * formatting rules are simple:
 *
 *   - Quote any field containing `"`, `,`, `\n`, or `\r`.
 *   - Inside a quoted field, escape `"` as `""`.
 *   - Use CRLF line terminators (Excel-friendly default).
 *   - Render `null`/`undefined` as the empty string, dates as ISO-8601.
 */
type Cell = string | number | boolean | Date | null | undefined;

function escape(cell: Cell): string {
  if (cell === null || cell === undefined) return '';
  const raw =
    cell instanceof Date
      ? cell.toISOString()
      : typeof cell === 'boolean'
        ? cell ? 'true' : 'false'
        : String(cell);
  if (/[",\r\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export function toCsv(headers: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const lines: string[] = [headers.map(escape).join(',')];
  for (const r of rows) lines.push(r.map(escape).join(','));
  return lines.join('\r\n') + '\r\n';
}

/** Build the standard Response for a CSV download. Filename gets a date stamp. */
export function csvResponse(filename: string, body: string): Response {
  const stamp = new Date().toISOString().slice(0, 10);
  const safe = filename.replace(/[^a-z0-9_-]/gi, '-');
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${safe}-${stamp}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
