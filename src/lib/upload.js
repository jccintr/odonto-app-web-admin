import { Images } from '../api/index.js';

export const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
export const extensionOf = (name) => String(name).split('.').pop().toLowerCase();

/** Valida o arquivo antes de enviar. Devolve a mensagem de erro ou null. */
export function validateImageFile(file, maxBytes) {
  if (!file) return 'Escolha uma imagem.';
  if (!ACCEPTED_EXTENSIONS.includes(extensionOf(file.name))) return 'Formato não aceito. Envie JPG, PNG, WEBP ou HEIC (PDF não é aceito).';
  if (maxBytes && file.size > maxBytes) return `A imagem passa de ${Math.round(maxBytes / 1024 / 1024)} MB. Reduza o tamanho e tente de novo.`;
  if (file.size === 0) return 'O arquivo está vazio.';
  return null;
}

/**
 * Envia a imagem em dois passos: (1) a API assina o envio, o arquivo vai DIRETO ao Cloudinary; (2) a API registra a imagem na ficha.
 * `fetchImpl` existe para os testes.
 */
export async function uploadPatientImage(patientId, file, meta, fetchImpl = fetch) {
  const signed = await Images.sign(patientId);
  const problem = validateImageFile(file, signed.maxBytes);
  if (problem) throw new Error(problem);

  const form = new FormData();
  for (const [key, value] of Object.entries(signed.fields)) form.append(key, value);
  form.append('file', file);
  let res;
  try { res = await fetchImpl(signed.uploadUrl, { method: 'POST', body: form }); } catch { throw new Error('Não foi possível enviar o arquivo. Verifique a conexão e tente de novo.'); }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ? `O armazenamento recusou o arquivo: ${body.error.message}` : 'O armazenamento recusou o arquivo.');
  }
  return Images.register(patientId, { publicId: signed.publicId, ...meta });
}
