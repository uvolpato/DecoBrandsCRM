// Il modello delle email (§7.13, D-211): HTML con lo stile dell'app (logo, riquadro dei dati,
// pulsante) e il testo semplice accanto, per i client che non leggono l'HTML.
import { allegatiMail, messaggioEmailCambiata, messaggioLinkReset, messaggioPassword } from '../src/posta';

const PULSANTE = 'background:#0d6efd';

describe('modello delle email (D-211)', () => {
  it('benvenuto: oggetto, testo semplice e HTML con logo, dati e pulsante; il nome è escapato', () => {
    const m = messaggioPassword({ email: 'mario@x.it', nome: 'Mario <Rossi>', username: 'mario.rossi' }, 'K7m2-Pq9x', 'benvenuto');
    expect(m.oggetto).toBe('Decobrands: il tuo accesso');
    expect(m.testo).toContain('nome utente: mario.rossi');
    expect(m.testo).toContain('K7m2-Pq9x');
    expect(m.html).toContain('Mario &lt;Rossi&gt;');
    expect(m.html).not.toContain('Mario <Rossi>');
    expect(m.html).toContain('src="cid:logo-decobrands"'); // il logo viaggia nel messaggio (D-214)
    expect(m.html).toContain(PULSANTE);
    expect(m.html).toContain('mario.rossi');
    expect(m.html).toContain('K7m2-Pq9x');
  });

  it('nuova password provvisoria: lo dice e il testo avvisa che quella di prima non vale più', () => {
    const m = messaggioPassword({ email: 'm@x.it', nome: 'Mario', username: 'mario' }, 'pw', 'password');
    expect(m.oggetto).toBe('Decobrands: nuova password provvisoria');
    expect(m.testo).toContain('La password di prima non vale più');
    expect(m.html).toContain('La password di prima non vale più');
  });

  it('link di reimposta: il codice sta nel pulsante e nel testo, la nota dice di ignorarlo', () => {
    const m = messaggioLinkReset('Mario', 'CODICE-DI-PROVA', 'mario@x.it');
    expect(m.oggetto).toBe('Decobrands: reimposta la password');
    expect(m.a).toBe('mario@x.it');
    expect(m.html).toContain('/accesso/password/CODICE-DI-PROVA');
    expect(m.testo).toContain('/accesso/password/CODICE-DI-PROVA');
    expect(m.html).toContain('ignora questa email');
  });

  it('avviso di email cambiata: chi, quando, senza pulsante', () => {
    const m = messaggioEmailCambiata('vecchio@x.it', { username: 'mario' }, { nome: 'Ugo Volpato' }, new Date('2026-11-20T10:30:00Z'));
    expect(m.a).toBe('vecchio@x.it');
    expect(m.html).toContain('mario');
    expect(m.html).toContain('Ugo Volpato');
    expect(m.html).not.toContain(PULSANTE);
  });

  it('il logo è allegato al messaggio (cid), non linkato a un indirizzo esterno', () => {
    expect(allegatiMail()).toEqual([expect.objectContaining({ filename: 'logo-decobrands.png', cid: 'logo-decobrands' })]);
  });
});
