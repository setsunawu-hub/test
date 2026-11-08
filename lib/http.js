export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export const MAX_BODY_BYTES = 10 * 1024;

export async function readJson(request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return { tooLarge: true, body: {} };
  try {
    return { tooLarge: false, body: JSON.parse(raw) ?? {} };
  } catch {
    return { tooLarge: false, body: {} };
  }
}
