"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  Phone,
  Save,
  Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  STATUSES,
  type PhotoPhase,
  type StatusHistory,
  type WorkOrder,
  type WorkOrderPhoto,
  type WorkStatus
} from "@/lib/types";

export function WorkOrderDetail({
  id,
  onBack,
  onUpdated
}: {
  id: string;
  onBack: () => void;
  onUpdated: () => void;
}) {
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [photos, setPhotos] = useState<WorkOrderPhoto[]>([]);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [message, setMessage] = useState("");
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const [orderRes, photoRes, historyRes] = await Promise.all([
      supabase
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
        .eq("id", id)
        .single(),
      supabase
        .from("work_order_photos")
        .select("*")
        .eq("work_order_id", id)
        .order("created_at"),
      supabase
        .from("status_history")
        .select("*")
        .eq("work_order_id", id)
        .order("changed_at", { ascending: false })
    ]);

    if (orderRes.data) setOrder(orderRes.data as unknown as WorkOrder);

    const photoRows = (photoRes.data ?? []) as WorkOrderPhoto[];
    const withUrls = await Promise.all(
      photoRows.map(async (photo) => {
        const { data } = await supabase.storage
          .from("work-order-photos")
          .createSignedUrl(photo.storage_path, 3600);
        return { ...photo, signedUrl: data?.signedUrl };
      })
    );

    setPhotos(withUrls);
    setHistory((historyRes.data ?? []) as StatusHistory[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`work-order-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_orders", filter: `id=eq.${id}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_order_photos", filter: `work_order_id=eq.${id}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  async function changeStatus(status: WorkStatus) {
    if (!order) return;
    setStatusSaving(true);
    setMessage("");

    const delivered_at =
      status === "Entregue"
        ? order.delivered_at ?? new Date().toISOString().slice(0, 10)
        : order.delivered_at;

    const { error } = await supabase
      .from("work_orders")
      .update({ status, delivered_at })
      .eq("id", order.id);

    if (error) setMessage(error.message);
    await load();
    onUpdated();
    setStatusSaving(false);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>, phase: PhotoPhase) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setMessage("");

    try {
      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${id}/${phase}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("work-order-photos")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined
          });

        if (uploadError) throw uploadError;

        const { error: rowError } = await supabase.from("work_order_photos").insert({
          work_order_id: id,
          phase,
          storage_path: path
        });

        if (rowError) throw rowError;
      }

      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar fotografia.");
    } finally {
      event.target.value = "";
    }
  }

  async function removePhoto(photo: WorkOrderPhoto) {
    if (!confirm("Apagar esta fotografia?")) return;

    await supabase.storage.from("work-order-photos").remove([photo.storage_path]);
    await supabase.from("work_order_photos").delete().eq("id", photo.id);
    await load();
  }

  if (loading) return <div className="card"><p className="muted">A carregar obra...</p></div>;
  if (!order) return <div className="card"><p>Obra não encontrada.</p></div>;

  const before = photos.filter((p) => p.phase === "before");
  const after = photos.filter((p) => p.phase === "after");

  return (
    <section className="page-card">
      <div className="detail-head">
        <button className="icon-button" onClick={onBack}><ArrowLeft /></button>
        <div className="grow">
          <p className="eyebrow">FOLHA DE OBRA</p>
          <h1>{order.order_number}</h1>
        </div>
        <span className="status-pill status-ready">{order.status}</span>
      </div>

      <article className="info-card">
        <div className="section-head tight">
          <h2>{order.customers?.name}</h2>
          {order.customers?.phone && (
            <a className="icon-button" href={`tel:${order.customers.phone}`}><Phone /></a>
          )}
        </div>
        <dl className="detail-grid">
          <Detail label="Telefone" value={order.customers?.phone} />
          <Detail label="NIF" value={order.customers?.nif} />
          <Detail label="Categoria" value={order.category} />
          <Detail label="Recebido" value={formatDate(order.received_at)} />
          <Detail label="Entregue" value={order.delivered_at ? formatDate(order.delivered_at) : "—"} />
          <Detail label="Veículo" value={order.vehicle_brand_model} />
          <Detail label="Matrícula" value={order.license_plate} />
          <Detail label="Motorização" value={order.engine} />
          <Detail label="Ref. turbo" value={order.turbo_reference} />
        </dl>

        {order.issue_description && (
          <div className="text-block"><b>Descrição</b><p>{order.issue_description}</p></div>
        )}
        {order.notes && (
          <div className="text-block"><b>Observações</b><p>{order.notes}</p></div>
        )}
      </article>

      <article className="info-card">
        <h2>Estado da obra</h2>
        <div className="status-steps">
          {STATUSES.map((status) => (
            <button
              key={status}
              className={order.status === status ? "selected" : ""}
              disabled={statusSaving}
              onClick={() => changeStatus(status)}
            >
              {order.status === status && <Check size={16} />}
              {status}
            </button>
          ))}
        </div>
        {message && <p className="error-text">{message}</p>}
      </article>

      <PhotoSection
        title="Antes da reparação"
        photos={before}
        onAdd={() => beforeRef.current?.click()}
        onDelete={removePhoto}
      />
      <input ref={beforeRef} hidden type="file" accept="image/*" capture="environment" multiple onChange={(e) => upload(e, "before")} />

      <PhotoSection
        title="Depois da reparação"
        photos={after}
        onAdd={() => afterRef.current?.click()}
        onDelete={removePhoto}
      />
      <input ref={afterRef} hidden type="file" accept="image/*" capture="environment" multiple onChange={(e) => upload(e, "after")} />

      <article className="info-card">
        <h2>Histórico</h2>
        <div className="timeline">
          {history.map((item) => (
            <div key={item.id} className="timeline-row">
              <span className="timeline-dot" />
              <div>
                <strong>{item.status}</strong>
                <small>{new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.changed_at))}</small>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function PhotoSection({
  title,
  photos,
  onAdd,
  onDelete
}: {
  title: string;
  photos: WorkOrderPhoto[];
  onAdd: () => void;
  onDelete: (photo: WorkOrderPhoto) => void;
}) {
  return (
    <article className="info-card">
      <div className="section-head tight">
        <h2>{title}</h2>
        <button className="secondary-button compact" onClick={onAdd}><Camera /> Adicionar</button>
      </div>
      {photos.length === 0 ? (
        <p className="muted">Sem fotografias.</p>
      ) : (
        <div className="photo-gallery">
          {photos.map((photo) => (
            <figure key={photo.id}>
              {photo.signedUrl && <img src={photo.signedUrl} alt={title} />}
              <button className="photo-delete" onClick={() => onDelete(photo)} aria-label="Apagar foto"><Trash2 size={16} /></button>
            </figure>
          ))}
        </div>
      )}
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT").format(new Date(`${value}T12:00:00`));
}
