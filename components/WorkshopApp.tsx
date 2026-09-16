"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ClipboardList,
  LogOut,
  Menu,
  Plus,
  Search,
  Users,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { WorkOrder } from "@/lib/types";
import { Dashboard } from "@/components/Dashboard";
import { NewWorkOrder } from "@/components/NewWorkOrder";
import { SearchPanel } from "@/components/SearchPanel";
import { WorkOrderDetail } from "@/components/WorkOrderDetail";

type View =
  | { name: "dashboard" }
  | { name: "new" }
  | { name: "search" }
  | { name: "detail"; id: string };

export function WorkshopApp({ session }: { session: Session }) {
  const [view, setView] = useState<View>({ name: "dashboard" });
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const userLabel = useMemo(
    () => session.user.email ?? "Utilizador",
    [session.user.email]
  );

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("work_orders")
      .select(`
        id,
        order_number,
        customer_id,
        category,
        status,
        received_at,
        delivered_at,
        vehicle_brand_model,
        license_plate,
        engine,
        turbo_reference,
        issue_description,
        notes,
        created_at,
        updated_at,
        customers (
          id,
          name,
          phone,
          nif,
          email,
          address
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) setOrders(data as unknown as WorkOrder[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("work-orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_orders" },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  function open(viewToOpen: View) {
    setView(viewToOpen);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-button ghost" onClick={() => setMenuOpen(true)} aria-label="Menu">
          <Menu />
        </button>
        <button className="brand-button" onClick={() => open({ name: "dashboard" })}>
          <span className="brand-small"><b>3Volution</b><i>Turbos</i></span>
        </button>
        <button className="icon-button ghost" onClick={logout} aria-label="Terminar sessão">
          <LogOut />
        </button>
      </header>

      {menuOpen && (
        <>
          <button className="menu-backdrop" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />
          <aside className="side-menu">
            <div className="side-menu-head">
              <div>
                <strong>3VolutionTurbos</strong>
                <small>{userLabel}</small>
              </div>
              <button className="icon-button ghost" onClick={() => setMenuOpen(false)}><X /></button>
            </div>

            <nav className="side-nav">
              <button onClick={() => open({ name: "dashboard" })}><ClipboardList /> Início</button>
              <button onClick={() => open({ name: "new" })}><Plus /> Nova obra</button>
              <button onClick={() => open({ name: "search" })}><Search /> Pesquisar</button>
              <button onClick={() => open({ name: "search" })}><Users /> Clientes / Obras</button>
            </nav>

            <button className="logout-button" onClick={logout}><LogOut /> Sair</button>
          </aside>
        </>
      )}

      <main className="content">
        {view.name === "dashboard" && (
          <Dashboard
            orders={orders}
            loading={loading}
            onNew={() => open({ name: "new" })}
            onSearch={() => open({ name: "search" })}
            onOpen={(id) => open({ name: "detail", id })}
          />
        )}

        {view.name === "new" && (
          <NewWorkOrder
            onCreated={(id) => {
              loadOrders();
              open({ name: "detail", id });
            }}
            onCancel={() => open({ name: "dashboard" })}
          />
        )}

        {view.name === "search" && (
          <SearchPanel onOpen={(id) => open({ name: "detail", id })} />
        )}

        {view.name === "detail" && (
          <WorkOrderDetail
            id={view.id}
            onBack={() => open({ name: "dashboard" })}
            onUpdated={loadOrders}
          />
        )}
      </main>

      <nav className="bottom-nav">
        <button className={view.name === "dashboard" ? "active" : ""} onClick={() => open({ name: "dashboard" })}>
          <ClipboardList /><span>Início</span>
        </button>
        <button className={view.name === "new" ? "active" : ""} onClick={() => open({ name: "new" })}>
          <Plus /><span>Nova obra</span>
        </button>
        <button className={view.name === "search" ? "active" : ""} onClick={() => open({ name: "search" })}>
          <Search /><span>Pesquisar</span>
        </button>
      </nav>
    </div>
  );
}
