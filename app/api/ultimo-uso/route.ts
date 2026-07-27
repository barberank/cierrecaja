import { NextResponse } from "next/server";

const DATABASE_ID = "01df799e-d266-48ef-b39e-95748b0345c1";
const TABLE_ID = "u7aUrJKPRpU0A2";
const LAST_USE_FIELD_ID = "mJm0I";
const SOFTR_API_URL = `https://tables-api.softr.io/api/v1/databases/${DATABASE_ID}/tables/${TABLE_ID}/records`;

export async function POST() {
  const apiKey = process.env.SOFTR_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "SOFTR_API_KEY no configurada" }, { status: 500 });
  }

  const headers = {
    "Softr-Api-Key": apiKey,
    "Content-Type": "application/json",
  };

  try {
    const listResponse = await fetch(`${SOFTR_API_URL}?limit=1`, {
      headers,
      cache: "no-store",
    });

    if (!listResponse.ok) {
      return NextResponse.json({ error: "No se pudo consultar la tabla" }, { status: 502 });
    }

    const listData = await listResponse.json();
    const record = listData?.data?.[0] ?? listData?.records?.[0] ?? listData?.[0];
    const now = new Date().toISOString();

    if (record?.id) {
      const updateResponse = await fetch(`${SOFTR_API_URL}/${record.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ fields: { [LAST_USE_FIELD_ID]: now } }),
      });

      if (!updateResponse.ok) {
        return NextResponse.json({ error: "No se pudo actualizar el último uso" }, { status: 502 });
      }
    } else {
      const createResponse = await fetch(SOFTR_API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ fields: { [LAST_USE_FIELD_ID]: now } }),
      });

      if (!createResponse.ok) {
        return NextResponse.json({ error: "No se pudo crear el registro de uso" }, { status: 502 });
      }
    }

    return NextResponse.json({ ok: true, lastUsedAt: now });
  } catch {
    return NextResponse.json({ error: "Error al registrar el último uso" }, { status: 500 });
  }
}
