import { SHOP, LIVES } from '../config/constants';

type TradeResult = { ok: boolean; reason?: string };

/**
 * ShopModal — a DOM overlay for the in-game currency ↔ heart exchange.
 *
 * Sits above the Phaser canvas (position:fixed). The caller is responsible for
 * pausing / resuming game physics around show() / hide().
 */
export class ShopModal {
  private readonly overlay: HTMLDivElement;

  // Live display elements updated by refresh()
  private eurEl!: HTMLSpanElement;
  private heartsEl!: HTMLSpanElement;
  private buyQtyEl!: HTMLSpanElement;
  private buyTotalEl!: HTMLSpanElement;
  private buyBtn!: HTMLButtonElement;
  private sellQtyEl!: HTMLSpanElement;
  private sellTotalEl!: HTMLSpanElement;
  private sellBtn!: HTMLButtonElement;
  private msgEl!: HTMLParagraphElement;

  private buyQty = 1;
  private sellQty = 1;

  // State injected on each show()
  private eur = 0;
  private hearts = 0;

  constructor(
    private readonly onBuy: (qty: number) => TradeResult,
    private readonly onSell: (qty: number) => TradeResult,
    private readonly onClose: () => void,
  ) {
    this.overlay = this.buildDOM();
    document.body.appendChild(this.overlay);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  show(eur: number, hearts: number): void {
    this.eur = eur;
    this.hearts = hearts;
    this.buyQty = 1;
    this.sellQty = 1;
    this.msgEl.textContent = '';
    this.refresh();
    this.overlay.style.display = 'flex';
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }

  /** Call after an external state change (buy/sell resolved by WorldScene) */
  update(eur: number, hearts: number): void {
    this.eur = eur;
    this.hearts = hearts;
    this.refresh();
  }

  destroy(): void {
    this.overlay.remove();
  }

  // ---------------------------------------------------------------------------
  // DOM construction
  // ---------------------------------------------------------------------------

  private buildDOM(): HTMLDivElement {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      display: 'none',
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.72)',
      zIndex: '9999',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Courier New", monospace',
    });

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      background: 'linear-gradient(160deg, #0d1b2a 0%, #1a2e44 100%)',
      border: '2px solid #4a8fc0',
      borderRadius: '12px',
      padding: '28px 36px',
      minWidth: '320px',
      maxWidth: '420px',
      color: '#e8f4ff',
      boxShadow: '0 0 40px rgba(74,143,192,0.45)',
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    });

    const title = document.createElement('h2');
    title.textContent = '🛒 Forest Shop';
    Object.assign(title.style, {
      margin: '0',
      fontSize: '20px',
      color: '#ffdd88',
      textShadow: '0 0 8px rgba(255,200,80,0.5)',
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      color: '#88aac8',
      fontSize: '20px',
      cursor: 'pointer',
      lineHeight: '1',
      padding: '0 4px',
    });
    closeBtn.addEventListener('click', () => {
      this.onClose();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Balance row
    const balance = document.createElement('div');
    Object.assign(balance.style, {
      display: 'flex',
      justifyContent: 'space-around',
      background: 'rgba(0,0,0,0.35)',
      borderRadius: '8px',
      padding: '10px 16px',
      marginBottom: '24px',
      fontSize: '15px',
    });

    this.eurEl = document.createElement('span');
    this.heartsEl = document.createElement('span');
    balance.appendChild(this.makeLabel('💶 Balance:', this.eurEl));
    balance.appendChild(this.makeLabel('❤️ Hearts:', this.heartsEl));

    // Rate info
    const rateInfo = document.createElement('p');
    rateInfo.textContent =
      `Rate: buy €${SHOP.BUY_RATE}/♥  ·  sell €${SHOP.SELL_RATE}/♥`;
    Object.assign(rateInfo.style, {
      margin: '0 0 20px',
      fontSize: '12px',
      color: '#88aac8',
      textAlign: 'center',
    });

    // Trade panels
    const panels = document.createElement('div');
    Object.assign(panels.style, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      marginBottom: '16px',
    });

    const [buyPanel, buyQtyEl, buyTotalEl, buyBtn] = this.buildTradePanel(
      '💸 Buy Hearts',
      '#3a7d44',
      '#4caf60',
      (d) => {
        this.buyQty = Math.max(1, this.buyQty + d);
        this.refresh();
      },
      () => {
        const result = this.onBuy(this.buyQty);
        this.showMsg(result);
      },
    );
    this.buyQtyEl = buyQtyEl;
    this.buyTotalEl = buyTotalEl;
    this.buyBtn = buyBtn;

    const [sellPanel, sellQtyEl, sellTotalEl, sellBtn] = this.buildTradePanel(
      '💰 Sell Hearts',
      '#7d3a3a',
      '#c0504d',
      (d) => {
        this.sellQty = Math.max(1, this.sellQty + d);
        this.refresh();
      },
      () => {
        const result = this.onSell(this.sellQty);
        this.showMsg(result);
      },
    );
    this.sellQtyEl = sellQtyEl;
    this.sellTotalEl = sellTotalEl;
    this.sellBtn = sellBtn;

    panels.appendChild(buyPanel);
    panels.appendChild(sellPanel);

    // Message area
    this.msgEl = document.createElement('p');
    Object.assign(this.msgEl.style, {
      margin: '0',
      minHeight: '20px',
      fontSize: '13px',
      textAlign: 'center',
      color: '#ffdd88',
    });

    dialog.appendChild(header);
    dialog.appendChild(balance);
    dialog.appendChild(rateInfo);
    dialog.appendChild(panels);
    dialog.appendChild(this.msgEl);

    overlay.appendChild(dialog);

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.onClose();
    });

    return overlay;
  }

  private makeLabel(label: string, valueEl: HTMLSpanElement): HTMLDivElement {
    const wrap = document.createElement('div');
    const lbl = document.createElement('span');
    lbl.textContent = label + ' ';
    Object.assign(lbl.style, { color: '#88aac8' });
    Object.assign(valueEl.style, { fontWeight: 'bold', color: '#e8f4ff' });
    wrap.appendChild(lbl);
    wrap.appendChild(valueEl);
    return wrap;
  }

  private buildTradePanel(
    title: string,
    bgColor: string,
    btnColor: string,
    changeQty: (delta: number) => void,
    doTrade: () => void,
  ): [HTMLDivElement, HTMLSpanElement, HTMLSpanElement, HTMLButtonElement] {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: 'rgba(0,0,0,0.3)',
      border: `1px solid ${bgColor}`,
      borderRadius: '8px',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      alignItems: 'center',
    });

    const ttl = document.createElement('div');
    ttl.textContent = title;
    Object.assign(ttl.style, { fontSize: '13px', fontWeight: 'bold', color: '#c8ddf0' });

    // Qty row
    const qtyRow = document.createElement('div');
    Object.assign(qtyRow.style, { display: 'flex', alignItems: 'center', gap: '10px' });

    const minus = this.makeSmallBtn('−', () => changeQty(-1));
    const qtyEl = document.createElement('span');
    qtyEl.textContent = '1';
    Object.assign(qtyEl.style, { fontSize: '18px', minWidth: '24px', textAlign: 'center' });
    const plus = this.makeSmallBtn('+', () => changeQty(1));

    qtyRow.appendChild(minus);
    qtyRow.appendChild(qtyEl);
    qtyRow.appendChild(plus);

    const totalEl = document.createElement('span');
    Object.assign(totalEl.style, { fontSize: '13px', color: '#aad0ee' });

    const btn = document.createElement('button');
    btn.textContent = 'Confirm';
    Object.assign(btn.style, {
      background: btnColor,
      border: 'none',
      borderRadius: '6px',
      color: '#fff',
      fontSize: '13px',
      fontFamily: 'inherit',
      padding: '6px 18px',
      cursor: 'pointer',
      width: '100%',
      fontWeight: 'bold',
    });
    btn.addEventListener('click', doTrade);
    btn.addEventListener('mouseover', () => {
      if (!btn.disabled) btn.style.filter = 'brightness(1.2)';
    });
    btn.addEventListener('mouseout', () => {
      btn.style.filter = '';
    });

    panel.appendChild(ttl);
    panel.appendChild(qtyRow);
    panel.appendChild(totalEl);
    panel.appendChild(btn);

    return [panel, qtyEl, totalEl, btn];
  }

  private makeSmallBtn(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid #4a6a88',
      borderRadius: '4px',
      color: '#e8f4ff',
      fontFamily: 'inherit',
      fontSize: '16px',
      width: '28px',
      height: '28px',
      cursor: 'pointer',
      lineHeight: '1',
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  // ---------------------------------------------------------------------------
  // State updates
  // ---------------------------------------------------------------------------

  private refresh(): void {
    this.eurEl.textContent = `€${this.eur}`;
    this.heartsEl.textContent = `${this.hearts} / ${LIVES.INITIAL}`;

    // Buy panel
    this.buyQtyEl.textContent = String(this.buyQty);
    this.buyTotalEl.textContent = `€${this.buyQty * SHOP.BUY_RATE}`;
    const canBuy =
      this.eur >= this.buyQty * SHOP.BUY_RATE &&
      this.hearts + this.buyQty <= LIVES.INITIAL;
    this.buyBtn.disabled = !canBuy;
    this.buyBtn.style.opacity = canBuy ? '1' : '0.4';
    this.buyBtn.style.cursor = canBuy ? 'pointer' : 'not-allowed';

    // Sell panel
    this.sellQtyEl.textContent = String(this.sellQty);
    this.sellTotalEl.textContent = `+€${this.sellQty * SHOP.SELL_RATE}`;
    const canSell = this.hearts - this.sellQty >= 1;
    this.sellBtn.disabled = !canSell;
    this.sellBtn.style.opacity = canSell ? '1' : '0.4';
    this.sellBtn.style.cursor = canSell ? 'pointer' : 'not-allowed';
  }

  private showMsg(result: TradeResult): void {
    if (result.ok) {
      this.msgEl.style.color = '#88ff88';
      this.msgEl.textContent = '✓ Trade complete!';
    } else {
      this.msgEl.style.color = '#ff8888';
      this.msgEl.textContent = result.reason ?? 'Cannot complete trade.';
    }
  }
}
