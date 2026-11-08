import { useState } from 'react';
import { Images } from '../../api/index.js';
import { errorMessage } from '../../api/client.js';
import { Alert, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, Loading, Modal, Pagination, Select, Textarea } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUI } from '../../context/UIContext.jsx';
import useResource from '../../hooks/useResource.js';
import { dayOf, formatDay } from '../../lib/dates.js';
import { IMAGE_KIND } from '../../lib/labels.js';
import { ALL_TEETH } from '../../lib/tooth.js';
import { ACCEPTED_EXTENSIONS, uploadPatientImage, validateImageFile } from '../../lib/upload.js';

const kindOptions = Object.entries(IMAGE_KIND);
const toothOptions = <>{[...ALL_TEETH].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n}</option>)}</>;

function UploadModal({ patient, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState({ kind: 'xray', tooth: '', takenOn: dayOf(), notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const send = async () => {
    const problem = validateImageFile(file);
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null);
    try {
      await uploadPatientImage(patient.id, file, { kind: meta.kind, tooth: meta.tooth ? Number(meta.tooth) : undefined, takenOn: meta.takenOn, notes: meta.notes.trim() || undefined });
      onDone(); onClose();
    } catch (err) { setError(err.code === 'STORAGE_NOT_CONFIGURED' ? 'O armazenamento de imagens ainda não foi configurado no servidor (chaves do Cloudinary).' : errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={busy ? undefined : onClose} dismissible={!busy} title="Enviar imagem"
      footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button><Button icon="upload" loading={busy} onClick={send}>Enviar</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Arquivo" hint={`${ACCEPTED_EXTENSIONS.join(', ').toUpperCase()} · até 10 MB`}>
          {({ id }) => <input id={id} type="file" accept="image/jpeg,image/png,image/webp,image/heic,.heic" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-4 file:py-2 file:font-medium file:text-primary" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">{({ id }) => <Select id={id} value={meta.kind} onChange={(e) => setMeta({ ...meta, kind: e.target.value })}>{kindOptions.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</Select>}</Field>
          <Field label="Dente (opcional)">{({ id }) => <Select id={id} value={meta.tooth} onChange={(e) => setMeta({ ...meta, tooth: e.target.value })}><option value="">—</option>{toothOptions}</Select>}</Field>
        </div>
        <Field label="Data da imagem">{({ id }) => <Input id={id} type="date" max={dayOf()} value={meta.takenOn} onChange={(e) => setMeta({ ...meta, takenOn: e.target.value })} />}</Field>
        <Field label="Observações">{({ id }) => <Textarea id={id} rows={2} maxLength={500} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} />}</Field>
      </div>
    </Modal>
  );
}

function ImageViewer({ patient, image, canEdit, onClose, onChanged }) {
  const ui = useUI();
  const [edit, setEdit] = useState(false);
  const [meta, setMeta] = useState({ kind: image.kind, tooth: image.tooth ?? '', takenOn: image.takenOn, notes: image.notes ?? '' });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try { await Images.update(patient.id, image.id, { kind: meta.kind, tooth: meta.tooth ? Number(meta.tooth) : null, takenOn: meta.takenOn, notes: meta.notes.trim() || null }); ui.success('Imagem atualizada.'); onChanged(); onClose(); } catch (err) { ui.error(err); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!(await ui.confirm({ title: 'Remover imagem?', message: 'O arquivo é apagado do armazenamento. O registro fica no histórico.', confirmLabel: 'Remover', danger: true }))) return;
    try { await Images.remove(patient.id, image.id); ui.success('Imagem removida.'); onChanged(); onClose(); } catch (err) { ui.error(err); }
  };

  return (
    <Modal open onClose={onClose} size="xl" title={`${IMAGE_KIND[image.kind]} — ${formatDay(image.takenOn)}`}
      footer={canEdit ? <><Button variant="secondary" className="text-danger" onClick={remove}>Remover</Button><Button variant="secondary" onClick={() => setEdit(!edit)}>{edit ? 'Cancelar edição' : 'Editar dados'}</Button>{edit && <Button loading={busy} onClick={save}>Salvar</Button>}</> : undefined}>
      <div className="flex flex-col gap-4">
        <img src={image.url} alt={`${IMAGE_KIND[image.kind]} de ${patient.name}`} className="mx-auto max-h-[60vh] rounded-lg bg-surface-2 object-contain" />
        <p className="text-center text-sm"><a href={image.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Abrir em outra aba</a> · {image.width && `${image.width}×${image.height} · `}{Math.round(image.bytes / 1024)} KB</p>
        {edit ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tipo">{({ id }) => <Select id={id} value={meta.kind} onChange={(e) => setMeta({ ...meta, kind: e.target.value })}>{kindOptions.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</Select>}</Field>
            <Field label="Dente">{({ id }) => <Select id={id} value={meta.tooth} onChange={(e) => setMeta({ ...meta, tooth: e.target.value })}><option value="">—</option>{toothOptions}</Select>}</Field>
            <Field label="Data">{({ id }) => <Input id={id} type="date" value={meta.takenOn} onChange={(e) => setMeta({ ...meta, takenOn: e.target.value })} />}</Field>
            <Field label="Observações" className="sm:col-span-2">{({ id }) => <Textarea id={id} rows={2} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} />}</Field>
          </div>
        ) : (
          <p className="text-sm">{image.tooth && <Badge className="mr-2">Dente {image.tooth}</Badge>}{image.notes || <span className="text-muted">Sem observações.</span>}</p>
        )}
      </div>
    </Modal>
  );
}

export default function ImagesTab({ patient }) {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('');
  const list = useResource(() => Images.list(patient.id, { kind: kind || undefined, page, perPage: 12 }), [patient.id, kind, page]);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(null);

  return (
    <Card>
      <CardHeader title="Imagens e radiografias"
        action={(
          <div className="flex items-center gap-2">
            <Select aria-label="Tipo de imagem" className="h-9 w-auto" value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }}><option value="">Todos os tipos</option>{kindOptions.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</Select>
            {isAdmin && <Button size="sm" icon="upload" onClick={() => setUploading(true)}>Enviar imagem</Button>}
          </div>
        )} />
      {list.loading && !list.data ? <Loading /> : list.error ? (
        <div className="p-4"><ErrorState error={list.error.code === 'STORAGE_NOT_CONFIGURED' ? { message: 'O armazenamento de imagens ainda não foi configurado no servidor.' } : list.error} onRetry={list.reload} /></div>
      ) : list.data.data.length === 0 ? <EmptyState icon="image" title="Nenhuma imagem">{isAdmin ? 'Envie radiografias, fotos e documentos do paciente.' : 'As imagens enviadas pelo dentista aparecem aqui.'}</EmptyState> : (
        <>
          <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.data.data.map((image) => (
              <li key={image.id}>
                <button type="button" onClick={() => setViewing(image)} className="group flex w-full flex-col overflow-hidden rounded-lg border border-border text-left hover:shadow-md">
                  <img src={image.url} alt="" loading="lazy" className="aspect-square w-full bg-surface-2 object-cover" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                  <span className="p-2 text-sm"><span className="font-medium">{IMAGE_KIND[image.kind]}</span>{image.tooth && <span className="text-muted"> · dente {image.tooth}</span>}<br /><span className="text-muted">{formatDay(image.takenOn)}</span></span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onChange={setPage} />
        </>
      )}
      {uploading && <UploadModal patient={patient} onClose={() => setUploading(false)} onDone={() => { setPage(1); list.reload(); }} />}
      {viewing && <ImageViewer patient={patient} image={viewing} canEdit={isAdmin} onClose={() => setViewing(null)} onChanged={list.reload} />}
    </Card>
  );
}
