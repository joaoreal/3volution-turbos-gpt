"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SearchResult, WorkStatus } from "@/lib/types";

const statusClass: Record<WorkStatus, string> = {
  "Recebido": "status-received",
  "Em diagnóstico": "status-diagnostic",
  "Em reparação": "status-repair",
  "Pronto": "status-ready",
  "Entregue": "status-delivered"
};

export function SearchPanel({ onOpen }: { onOpen: (id: string) => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase.rpc("search_work_orders", {
      search_term: term.trim()
    });

    if (!error) setResults((data ?? []) as SearchResult[]);
    setLoading(false);
  }

  return (
    <section className="page-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">PESQUISA</p>
          <h1>Encontrar obra</h1>
        </div>
      </div>

      <form className="search-bar" onSubmit={search}>
        <Search />
        <input
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Nome, telefone, NIF, nº obra, matrícula..."
        />
        <button className="primary-button compact">Pesquisar</button>
      </form>

      <p className="muted search-hint">
        Pode pesquisar por nome do cliente, telefone, NIF, nº da folha de obra, matrícula ou referência do turbo.
      </p>

      {loading && <div className="card"><p className="muted">A pesquisar...</p></div>}

      {!loading && searched && results.length === 0 && (
        <div className="empty-card">
          <Search size={30} />
          <h3>Sem resultados</h3>
          <p>Tenta outro nome, telefone, NIF ou número de obra.</p>
        </div>
      )}

      <div className="list">
        {results.map((result) => (
          <button className="order-row" key={result.order_id} onClick={() => onOpen(result.order_id)}>
            <div className="order-main">
              <strong>{result.order_number}</strong>
              <span>{result.customer_name}</span>
              <small>
                {[result.phone, result.nif ? `NIF ${result.nif}` : null, result.license_plate]
                  .filter(Boolean)
                  .join(" · ")}
              </small>
              <small>{result.category}</small>
            </div>
            <div className="order-side">
              <span className={`status-pill ${statusClass[result.status]}`}>{result.status}</span>
              <small>{formatDate(result.received_at)}</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT").format(new Date(`${value}T12:00:00`));
}
