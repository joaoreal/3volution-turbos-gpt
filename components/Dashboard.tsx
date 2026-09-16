"use client";

import { ClipboardPlus, Search, Wrench } from "lucide-react";
import type { WorkOrder, WorkStatus } from "@/lib/types";

const statusClass: Record<WorkStatus, string> = {
  "Recebido": "status-received",
  "Em diagnóstico": "status-diagnostic",
  "Em reparação": "status-repair",
  "Pronto": "status-ready",
  "Entregue": "status-delivered"
};

export function Dashboard({
  orders,
  loading,
  onNew,
  onSearch,
  onOpen
}: {
  orders: WorkOrder[];
  loading: boolean;
  onNew: () => void;
  onSearch: () => void;
  onOpen: (id: string) => void;
}) {
  const count = (status: WorkStatus) => orders.filter((o) => o.status === status).length;
  const deliveredToday = orders.filter((o) => {
    if (!o.delivered_at) return false;
    return o.delivered_at === new Date().toISOString().slice(0, 10);
  }).length;

  return (
    <section>
      <div className="hero">
        <div>
          <p className="eyebrow">OFICINA</p>
          <h1>Gestão de turbos</h1>
          <p>Obras, clientes, fotografias e estado do trabalho num só local.</p>
        </div>
        <Wrench size={40} />
      </div>

      <div className="stats-grid">
        <article><strong>{count("Recebido")}</strong><span>Recebidos</span></article>
        <article><strong>{count("Em reparação")}</strong><span>Em reparação</span></article>
        <article><strong>{count("Pronto")}</strong><span>Prontos</span></article>
        <article><strong>{deliveredToday}</strong><span>Entregues hoje</span></article>
      </div>

      <div className="quick-actions">
        <button className="primary-button" onClick={onNew}><ClipboardPlus /> Nova folha de obra</button>
        <button className="secondary-button" onClick={onSearch}><Search /> Pesquisa rápida</button>
      </div>

      <div className="section-head">
        <h2>Obras recentes</h2>
        <button className="text-button" onClick={onSearch}>Ver todas</button>
      </div>

      {loading ? (
        <div className="card"><p className="muted">A carregar obras...</p></div>
      ) : orders.length === 0 ? (
        <div className="empty-card">
          <ClipboardPlus size={32} />
          <h3>Ainda não existem obras</h3>
          <p>Cria a primeira folha de obra.</p>
        </div>
      ) : (
        <div className="list">
          {orders.slice(0, 12).map((order) => (
            <button className="order-row" key={order.id} onClick={() => onOpen(order.id)}>
              <div className="order-main">
                <strong>{order.order_number}</strong>
                <span>{order.customers?.name ?? "Cliente"}</span>
                <small>{order.category}</small>
              </div>
              <div className="order-side">
                <span className={`status-pill ${statusClass[order.status]}`}>{order.status}</span>
                <small>{formatDate(order.received_at)}</small>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT").format(new Date(`${value}T12:00:00`));
}
