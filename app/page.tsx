"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type PaymentMethod = "cash" | "transfer";

type Sale = {
  id: string;
  amount: number;
  method: PaymentMethod;
  createdAt: string;
  weekKey: string;
};

const STORAGE_KEY = "cierrecaja.sales.v1";
const WEEK_KEY = "cierrecaja.week.v1";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function getWeekKey(date = new Date()) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = local.getDay() || 7;
  local.setDate(local.getDate() - day + 1);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

function isSameLocalDay(iso: string, date = new Date()) {
  const value = new Date(iso);
  return (
    value.getFullYear() === date.getFullYear() &&
    value.getMonth() === date.getMonth() &&
    value.getDate() === date.getDate()
  );
}

function parseAmount(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

export default function Home() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [ready, setReady] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentWeek = getWeekKey();
    const storedWeek = window.localStorage.getItem(WEEK_KEY);

    if (storedWeek !== currentWeek) {
      window.localStorage.setItem(WEEK_KEY, currentWeek);
      window.localStorage.setItem(STORAGE_KEY, "[]");
      setSales([]);
      setReady(true);
      return;
    }

    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as Sale[];
      setSales(stored.filter((sale) => sale.weekKey === currentWeek));
    } catch {
      window.localStorage.setItem(STORAGE_KEY, "[]");
      setSales([]);
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  }, [sales, ready]);

  const totals = useMemo(() => {
    const today = sales.filter((sale) => isSameLocalDay(sale.createdAt));
    const sum = (items: Sale[]) => items.reduce((total, sale) => total + sale.amount, 0);

    return {
      today: sum(today),
      week: sum(sales),
      cash: sum(sales.filter((sale) => sale.method === "cash")),
      transfer: sum(sales.filter((sale) => sale.method === "transfer")),
      count: sales.length,
    };
  }, [sales]);

  function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseAmount(amount);
    if (parsedAmount <= 0) {
      amountRef.current?.focus();
      return;
    }

    const sale: Sale = {
      id: crypto.randomUUID(),
      amount: parsedAmount,
      method,
      createdAt: new Date().toISOString(),
      weekKey: getWeekKey(),
    };

    setSales((current) => [sale, ...current]);
    setAmount("");
    amountRef.current?.focus();
  }

  function undoLastSale() {
    setSales((current) => current.slice(1));
  }

  if (!ready) return null;

  return (
    <main className="shell">
      <section className="app-card">
        <header className="header">
          <div>
            <p className="eyebrow">REGISTRO SEMANAL</p>
            <h1>Cierre Caja</h1>
          </div>
          <div className="sale-count">
            <strong>{totals.count}</strong>
            <span>{totals.count === 1 ? "venta" : "ventas"}</span>
          </div>
        </header>

        <section className="summary-grid" aria-label="Resumen de caja">
          <article className="summary-card main-total">
            <span>Hoy</span>
            <strong>{money.format(totals.today)}</strong>
          </article>
          <article className="summary-card">
            <span>Esta semana</span>
            <strong>{money.format(totals.week)}</strong>
          </article>
          <article className="summary-card compact">
            <span>Efectivo</span>
            <strong>{money.format(totals.cash)}</strong>
          </article>
          <article className="summary-card compact">
            <span>Transferencia</span>
            <strong>{money.format(totals.transfer)}</strong>
          </article>
        </section>

        <form className="sale-form" onSubmit={submitSale}>
          <label htmlFor="amount">Monto</label>
          <div className="amount-field">
            <span>$</span>
            <input
              ref={amountRef}
              id="amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              aria-label="Monto de la venta"
            />
          </div>

          <fieldset>
            <legend>¿Cómo pagó?</legend>
            <div className="method-selector">
              <button
                type="button"
                className={method === "cash" ? "selected" : ""}
                onClick={() => setMethod("cash")}
              >
                Efectivo
              </button>
              <button
                type="button"
                className={method === "transfer" ? "selected" : ""}
                onClick={() => setMethod("transfer")}
              >
                Transferencia
              </button>
            </div>
          </fieldset>

          <button className="submit-button" type="submit">
            Registrar venta
          </button>
        </form>

        <section className="movements">
          <div className="section-title">
            <h2>Últimos movimientos</h2>
            <button type="button" onClick={undoLastSale} disabled={sales.length === 0}>
              Deshacer última
            </button>
          </div>

          {sales.length === 0 ? (
            <div className="empty-state">
              <p>Todavía no registraste ventas esta semana.</p>
            </div>
          ) : (
            <ul>
              {sales.map((sale) => {
                const date = new Date(sale.createdAt);
                return (
                  <li key={sale.id}>
                    <div>
                      <strong>{sale.method === "cash" ? "Efectivo" : "Transferencia"}</strong>
                      <span>
                        {date.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" })} · {date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <strong>{money.format(sale.amount)}</strong>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer>
          Los datos quedan guardados solamente en este dispositivo y se eliminan al comenzar una nueva semana.
        </footer>
      </section>
    </main>
  );
}
