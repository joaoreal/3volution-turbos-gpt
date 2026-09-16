"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { Camera, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, type Category, type PhotoPhase } from "@/lib/types";

interface Draft {
  customerName: string;
  phone: string;
  nif: string;
  email: string;
  address: string;
  category: Category;
  receivedAt: string;
  vehicleBrandModel: string;
  licensePlate: string;
  engine: string;
  turboReference: string;
  issueDescription: string;
  notes: string;
}

export function NewWorkOrder({
  onCreated,
  onCancel
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Draft>({
    customerName: "",
    phone: "",
    nif: "",
    email: "",
    address: "",
    category: "Reparações de Turbos",
    receivedAt: new Date().toISOString().slice(0, 10),
    vehicleBrandModel: "",
    licensePlate: "",
    engine: "",
    turboReference: "",
    issueDescription: "",
    notes: ""
  });
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [afterFiles, setAfterFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  function filesChanged(
    event: ChangeEvent<HTMLInputElement>,
    phase: PhotoPhase
  ) {
    const files = Array.from(event.target.files ?? []);
    if (phase === "before") setBeforeFiles(files);
    else setAfterFiles(files);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const { data, error } = await supabase.rpc("create_work_order", {
      p_customer_name: form.customerName.trim(),
      p_phone: cleanOrNull(form.phone),
      p_nif: cleanOrNull(form.nif),
      p_email: cleanOrNull(form.email),
      p_address: cleanOrNull(form.address),
      p_category: form.category,
      p_received_at: form.receivedAt,
      p_vehicle_brand_model: cleanOrNull(form.vehicleBrandModel),
      p_license_plate: cleanOrNull(form.licensePlate)?.toUpperCase() ?? null,
      p_engine: cleanOrNull(form.engine),
      p_turbo_reference: cleanOrNull(form.turboReference),
      p_issue_description: cleanOrNull(form.issueDescription),
      p_notes: cleanOrNull(form.notes)
    });

    if (error || !data?.length) {
      setMessage(error?.message ?? "Não foi possível criar a obra.");
      setSaving(false);
      return;
    }

    const orderId = data[0].id as string;

    try {
      await uploadMany(orderId, beforeFiles, "before");
      await uploadMany(orderId, afterFiles, "after");
      onCreated(orderId);
    } catch (uploadError) {
      setMessage(
        `A obra foi criada, mas houve um erro nas fotografias: ${
          uploadError instanceof Error ? uploadError.message : "erro desconhecido"
        }`
      );
      setSaving(false);
    }
  }

  return (
    <section className="page-card">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">NOVA</p>
          <h1>Folha de obra</h1>
        </div>
        <button className="icon-button" onClick={onCancel} aria-label="Cancelar"><X /></button>
      </div>

      <form className="form-grid" onSubmit={submit}>
        <fieldset>
          <legend>Cliente</legend>
          <label className="full">Nome *
            <input required value={form.customerName} onChange={(e) => update("customerName", e.target.value)} />
          </label>
          <label>Telefone
            <input inputMode="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </label>
          <label>NIF
            <input inputMode="numeric" value={form.nif} onChange={(e) => update("nif", e.target.value)} />
          </label>
          <label>Email
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </label>
          <label>Morada
            <input value={form.address} onChange={(e) => update("address", e.target.value)} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Trabalho</legend>
          <label>Categoria *
            <select value={form.category} onChange={(e) => update("category", e.target.value as Category)}>
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label>Data de receção *
            <input type="date" required value={form.receivedAt} onChange={(e) => update("receivedAt", e.target.value)} />
          </label>
          <label>Marca / Modelo
            <input value={form.vehicleBrandModel} onChange={(e) => update("vehicleBrandModel", e.target.value)} placeholder="Ex.: BMW 320d" />
          </label>
          <label>Matrícula
            <input value={form.licensePlate} onChange={(e) => update("licensePlate", e.target.value)} placeholder="AA-12-BB" />
          </label>
          <label>Motorização
            <input value={form.engine} onChange={(e) => update("engine", e.target.value)} placeholder="Ex.: 2.0 190cv" />
          </label>
          <label>Referência do turbo
            <input value={form.turboReference} onChange={(e) => update("turboReference", e.target.value)} />
          </label>
          <label className="full">Descrição do problema
            <textarea rows={4} value={form.issueDescription} onChange={(e) => update("issueDescription", e.target.value)} />
          </label>
          <label className="full">Observações
            <textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Fotografias</legend>
          <div className="photo-input-grid">
            <button type="button" className="photo-picker" onClick={() => beforeRef.current?.click()}>
              <Camera />
              <strong>Antes</strong>
              <span>{beforeFiles.length ? `${beforeFiles.length} foto(s)` : "Adicionar fotos"}</span>
            </button>
            <button type="button" className="photo-picker" onClick={() => afterRef.current?.click()}>
              <Camera />
              <strong>Depois</strong>
              <span>{afterFiles.length ? `${afterFiles.length} foto(s)` : "Adicionar fotos"}</span>
            </button>
          </div>
          <input ref={beforeRef} hidden type="file" accept="image/*" capture="environment" multiple onChange={(e) => filesChanged(e, "before")} />
          <input ref={afterRef} hidden type="file" accept="image/*" capture="environment" multiple onChange={(e) => filesChanged(e, "after")} />
        </fieldset>

        {message && <p className="error-text full-width">{message}</p>}

        <button className="primary-button full-width" disabled={saving}>
          <Save />
          {saving ? "A guardar..." : "Criar folha de obra"}
        </button>
      </form>
    </section>
  );
}

function cleanOrNull(value: string) {
  const cleaned = value.trim();
  return cleaned === "" ? null : cleaned;
}

async function uploadMany(orderId: string, files: File[], phase: PhotoPhase) {
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${orderId}/${phase}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("work-order-photos")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined
      });

    if (uploadError) throw uploadError;

    const { error: rowError } = await supabase.from("work_order_photos").insert({
      work_order_id: orderId,
      phase,
      storage_path: path
    });

    if (rowError) throw rowError;
  }
}
