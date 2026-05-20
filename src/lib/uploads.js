// Client for the localization backend.
export async function localize({ title, genre, files, model }) {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("genre", genre);
  if (model) fd.append("model", model);
  for (const f of files) fd.append("pages", f);
  const res = await fetch("/api/localize", { method: "POST", body: fd });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return res.json();
}

export async function listUploads() {
  try {
    const res = await fetch("/api/uploads");
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

export async function getUpload(id) {
  const res = await fetch(`/api/uploads/${id}`);
  if (!res.ok) throw new Error("Not found");
  return res.json();
}

export async function publishUpload(id) {
  const res = await fetch(`/api/uploads/${id}/publish`, { method: "POST" });
  if (!res.ok) throw new Error("Publish failed");
  return res.json();
}

export async function discardUpload(id) {
  await fetch(`/api/uploads/${id}`, { method: "DELETE" });
}
