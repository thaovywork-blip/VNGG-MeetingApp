export async function callGreenode(prompt: string): Promise<string> {
  const base = process.env.GREENODE_BASE_URL!;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GREENODE_API_KEY}` },
    body: JSON.stringify({
      model: process.env.GREENODE_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 8192,
    }),
  });
  if (!res.ok) { console.error(`GREENODE_ERROR: status ${res.status}`); throw new Error("GREENODE_ERROR"); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
