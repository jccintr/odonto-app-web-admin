import { beforeEach, describe, expect, it, vi } from 'vitest';

const Images = vi.hoisted(() => ({ sign: vi.fn(), register: vi.fn() }));
vi.mock('../../src/api/index.js', () => ({ Images }));
const { uploadPatientImage, validateImageFile, extensionOf } = await import('../../src/lib/upload.js');

const file = (name = 'raio-x.jpg', size = 1000) => new File([new Uint8Array(size)], name);
const signed = { publicId: 'odontoapp/c/p/u', uploadUrl: 'https://upload.test/image/upload', maxBytes: 10 * 1024 * 1024, fields: { public_id: 'odontoapp/c/p/u', type: 'private', timestamp: 1, api_key: 'k', signature: 's' } };

beforeEach(() => { Images.sign.mockReset().mockResolvedValue(signed); Images.register.mockReset().mockResolvedValue({ id: 'img-1' }); });

describe('validateImageFile', () => {
  it('aceita imagens dentro do limite', () => {
    expect(validateImageFile(file('a.JPG'), signed.maxBytes)).toBeNull();
    for (const name of ['a.jpeg', 'a.png', 'a.webp', 'a.heic']) expect(validateImageFile(file(name))).toBeNull();
    expect(extensionOf('Raio.X.PNG')).toBe('png');
  });
  it('recusa PDF, formato desconhecido, arquivo grande, vazio e ausente', () => {
    expect(validateImageFile(file('laudo.pdf'))).toMatch(/PDF não é aceito/);
    expect(validateImageFile(file('a.gif'))).toMatch(/Formato não aceito/);
    expect(validateImageFile(file('a.jpg', 11 * 1024 * 1024), signed.maxBytes)).toMatch(/passa de 10 MB/);
    expect(validateImageFile(file('a.jpg', 0))).toMatch(/vazio/);
    expect(validateImageFile(null)).toMatch(/Escolha/);
  });
});

describe('uploadPatientImage', () => {
  it('assina, envia o arquivo direto ao armazenamento com os campos assinados e registra', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const result = await uploadPatientImage('p1', file(), { kind: 'xray', tooth: 16 }, fetchImpl);
    expect(result).toEqual({ id: 'img-1' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(signed.uploadUrl);
    expect(init.method).toBe('POST');
    expect([...init.body.keys()].sort()).toEqual(['api_key', 'file', 'public_id', 'signature', 'timestamp', 'type']);
    expect(init.body.get('signature')).toBe('s');
    expect(Images.register).toHaveBeenCalledWith('p1', { publicId: signed.publicId, kind: 'xray', tooth: 16 });
  });

  it('arquivo inválido: nem tenta enviar ao armazenamento', async () => {
    const fetchImpl = vi.fn();
    await expect(uploadPatientImage('p1', file('a.pdf'), {}, fetchImpl)).rejects.toThrow(/PDF/);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(Images.register).not.toHaveBeenCalled();
  });

  it('o armazenamento recusa: mostra o motivo e não registra', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: 'File size too large' } }) });
    await expect(uploadPatientImage('p1', file(), {}, fetchImpl)).rejects.toThrow('O armazenamento recusou o arquivo: File size too large');
    fetchImpl.mockResolvedValue({ ok: false, json: async () => { throw new Error('x'); } });
    await expect(uploadPatientImage('p1', file(), {}, fetchImpl)).rejects.toThrow('O armazenamento recusou o arquivo.');
    expect(Images.register).not.toHaveBeenCalled();
  });

  it('sem conexão no envio: mensagem clara', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('offline'));
    await expect(uploadPatientImage('p1', file(), {}, fetchImpl)).rejects.toThrow(/Verifique a conexão/);
  });

  it('erro da API ao assinar (ex.: armazenamento não configurado) é repassado', async () => {
    Images.sign.mockRejectedValue(Object.assign(new Error('não configurado'), { code: 'STORAGE_NOT_CONFIGURED' }));
    await expect(uploadPatientImage('p1', file(), {}, vi.fn())).rejects.toMatchObject({ code: 'STORAGE_NOT_CONFIGURED' });
  });
});
