import { LEVELS } from '../config/levels';
import { LIVES } from '../config/constants';

/**
 * DebugPanel — a DOM overlay toggled with ~ for dev/testing.
 *
 * Controls: level jumping, money/lives adjustment, noclip toggle.
 * Same DOM overlay pattern as ShopModal.
 */

export interface DebugCallbacks {
  getScore: () => number;
  getLives: () => number;
  getCurrentLevel: () => number;
  getNoclip: () => boolean;
  setScore: (value: number) => void;
  setLives: (value: number) => void;
  goToLevel: (id: number) => void;
  toggleNoclip: () => boolean;  // returns new state
}

export class DebugPanel {
  private readonly overlay: HTMLDivElement;
  private visible = false;

  private scoreEl!: HTMLSpanElement;
  private livesEl!: HTMLSpanElement;
  private levelEl!: HTMLSpanElement;
  private noclipEl!: HTMLSpanElement;
  private msgEl!: HTMLParagraphElement;

  constructor(private readonly cb: DebugCallbacks) {
    this.overlay = this.buildDOM();
    document.body.appendChild(this.overlay);
  }

  toggle(): void {
    this.visible = !this.visible;
    if (this.visible) {
      this.refresh();
      this.overlay.style.display = 'flex';
    } else {
      this.overlay.style.display = 'none';
    }
  }

  get isVisible(): boolean {
    return this.visible;
  }

  hide(): void {
    this.visible = false;
    this.overlay.style.display = 'none';
  }

  refresh(): void {
    this.scoreEl.textContent = `€${this.cb.getScore()}`;
    this.livesEl.textContent = `${this.cb.getLives()} / ${LIVES.INITIAL}`;
    const lvl = this.cb.getCurrentLevel();
    const def = LEVELS.get(lvl);
    this.levelEl.textContent = `#${lvl} — ${def?.name ?? '???'}`;
    this.noclipEl.textContent = this.cb.getNoclip() ? 'ON' : 'OFF';
    this.noclipEl.style.color = this.cb.getNoclip() ? '#88ff88' : '#ff8888';
  }

  destroy(): void {
    this.overlay.remove();
  }

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------

  private buildDOM(): HTMLDivElement {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      display: 'none',
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.6)',
      zIndex: '9999',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Courier New", monospace',
    });

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      background: 'linear-gradient(160deg, #1a0a2e 0%, #2a1a3e 100%)',
      border: '2px solid #9944cc',
      borderRadius: '12px',
      padding: '24px 32px',
      minWidth: '340px',
      maxWidth: '440px',
      color: '#e8e0ff',
      boxShadow: '0 0 40px rgba(153,68,204,0.45)',
    });

    // Header
    const header = this.makeHeader();
    dialog.appendChild(header);

    // Status display
    const status = this.makeStatusSection();
    dialog.appendChild(status);

    // Level jump
    dialog.appendChild(this.makeSectionTitle('Level'));
    dialog.appendChild(this.makeLevelSection());

    // Money
    dialog.appendChild(this.makeSectionTitle('Money'));
    dialog.appendChild(this.makeMoneySection());

    // Lives
    dialog.appendChild(this.makeSectionTitle('Lives'));
    dialog.appendChild(this.makeLivesSection());

    // Noclip
    dialog.appendChild(this.makeSectionTitle('Cheats'));
    dialog.appendChild(this.makeNoclipSection());

    // Message area
    this.msgEl = document.createElement('p');
    Object.assign(this.msgEl.style, {
      margin: '12px 0 0',
      minHeight: '18px',
      fontSize: '12px',
      textAlign: 'center',
      color: '#cc88ff',
    });
    dialog.appendChild(this.msgEl);

    overlay.appendChild(dialog);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hide();
    });

    return overlay;
  }

  private makeHeader(): HTMLDivElement {
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
    });

    const title = document.createElement('h2');
    title.textContent = '~ Debug Panel';
    Object.assign(title.style, {
      margin: '0',
      fontSize: '18px',
      color: '#cc88ff',
      textShadow: '0 0 8px rgba(200,100,255,0.5)',
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      color: '#8866aa',
      fontSize: '20px',
      cursor: 'pointer',
      lineHeight: '1',
      padding: '0 4px',
    });
    closeBtn.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeBtn);
    return header;
  }

  private makeStatusSection(): HTMLDivElement {
    const status = document.createElement('div');
    Object.assign(status.style, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '6px 16px',
      background: 'rgba(0,0,0,0.35)',
      borderRadius: '8px',
      padding: '10px 16px',
      marginBottom: '16px',
      fontSize: '13px',
    });

    this.levelEl = document.createElement('span');
    this.scoreEl = document.createElement('span');
    this.livesEl = document.createElement('span');
    this.noclipEl = document.createElement('span');

    status.appendChild(this.makeLabel('Level:', this.levelEl));
    status.appendChild(this.makeLabel('Score:', this.scoreEl));
    status.appendChild(this.makeLabel('Lives:', this.livesEl));
    status.appendChild(this.makeLabel('Noclip:', this.noclipEl));

    return status;
  }

  private makeSectionTitle(text: string): HTMLDivElement {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, {
      fontSize: '11px',
      color: '#8866aa',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '6px',
      marginTop: '10px',
    });
    return el;
  }

  private makeLevelSection(): HTMLDivElement {
    const row = this.makeRow();

    for (const [id, def] of LEVELS) {
      const btn = this.makeBtn(`#${id} ${def.name}`, () => {
        this.cb.goToLevel(id);
        this.hide();
      });
      btn.style.fontSize = '11px';
      row.appendChild(btn);
    }

    return row;
  }

  private makeMoneySection(): HTMLDivElement {
    const row = this.makeRow();

    for (const delta of [+50, +500, -50]) {
      const label = delta > 0 ? `+€${delta}` : `€${delta}`;
      row.appendChild(this.makeBtn(label, () => {
        const newVal = Math.max(0, this.cb.getScore() + delta);
        this.cb.setScore(newVal);
        this.refresh();
        this.flash(delta > 0 ? `Set to €${newVal}` : `Set to €${newVal}`);
      }));
    }

    row.appendChild(this.makeBtn('= €150', () => {
      this.cb.setScore(150);
      this.refresh();
      this.flash('Score set to €150');
    }));

    row.appendChild(this.makeBtn('= €0', () => {
      this.cb.setScore(0);
      this.refresh();
      this.flash('Score reset to €0');
    }));

    return row;
  }

  private makeLivesSection(): HTMLDivElement {
    const row = this.makeRow();

    row.appendChild(this.makeBtn('+1 ❤️', () => {
      const newVal = Math.min(LIVES.INITIAL, this.cb.getLives() + 1);
      this.cb.setLives(newVal);
      this.refresh();
    }));

    row.appendChild(this.makeBtn('-1 ❤️', () => {
      const newVal = Math.max(1, this.cb.getLives() - 1);
      this.cb.setLives(newVal);
      this.refresh();
    }));

    row.appendChild(this.makeBtn(`Max (${LIVES.INITIAL})`, () => {
      this.cb.setLives(LIVES.INITIAL);
      this.refresh();
      this.flash('Lives maxed out');
    }));

    return row;
  }

  private makeNoclipSection(): HTMLDivElement {
    const row = this.makeRow();

    row.appendChild(this.makeBtn('Toggle Noclip', () => {
      const state = this.cb.toggleNoclip();
      this.refresh();
      this.flash(state ? 'Noclip ON — walk through walls' : 'Noclip OFF');
    }));

    return row;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private makeRow(): HTMLDivElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
      marginBottom: '6px',
    });
    return row;
  }

  private makeLabel(label: string, valueEl: HTMLSpanElement): HTMLDivElement {
    const wrap = document.createElement('div');
    const lbl = document.createElement('span');
    lbl.textContent = label + ' ';
    Object.assign(lbl.style, { color: '#8866aa' });
    Object.assign(valueEl.style, { fontWeight: 'bold', color: '#e8e0ff' });
    wrap.appendChild(lbl);
    wrap.appendChild(valueEl);
    return wrap;
  }

  private makeBtn(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
      background: 'rgba(153,68,204,0.25)',
      border: '1px solid #6633aa',
      borderRadius: '6px',
      color: '#e8e0ff',
      fontFamily: 'inherit',
      fontSize: '12px',
      padding: '5px 12px',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    });
    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseover', () => {
      btn.style.background = 'rgba(153,68,204,0.5)';
    });
    btn.addEventListener('mouseout', () => {
      btn.style.background = 'rgba(153,68,204,0.25)';
    });
    return btn;
  }

  private flash(msg: string): void {
    this.msgEl.textContent = msg;
    setTimeout(() => {
      if (this.msgEl.textContent === msg) this.msgEl.textContent = '';
    }, 2000);
  }
}
