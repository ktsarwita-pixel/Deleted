import { test, expect, type Page } from '@playwright/test';

async function clickHouseObject(page: Page, x: number, y: number) {
  const rect = (await page.locator('.game-canvas').boundingBox())!;
  const player = await page.evaluate(() => JSON.parse(localStorage.getItem('karhutla-wira-v3') ?? 'null')?.player ?? { x: 435, y: 365 });
  const scale = Math.max(rect.width >= 600 ? .65 : .72, Math.min(rect.width / 840, rect.height / 570));
  const clamp = (n: number, half: number, total: number) => total <= half * 2 ? total / 2 : Math.max(half, Math.min(total - half, n));
  const cx = clamp(player.x, rect.width / scale / 2, 880);
  const cy = clamp(player.y - 25, rect.height / scale / 2, 620);
  await page.mouse.click(rect.x + rect.width / 2 + (x - cx) * scale, rect.y + rect.height / 2 + (y - cy) * scale);
}

test('complete the story, buy all equipment, refill and reach 100%', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.wallet-value')).toHaveText('Rp 12.000,00');
  await expect(page.locator('.wallet .section-label')).toContainText('Uang Wira');
  await expect(page.getByText(/Uang Masyarakat/i)).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/final-desktop.png', fullPage: true });

  await clickHouseObject(page, 660, 356);
  await expect(page.locator('.wallet-value')).toHaveText('Rp 24.000,00');
  await clickHouseObject(page, 204, 176);
  await expect(page.locator('.wallet-value')).toHaveText('Rp 34.000,00');
  await page.getByRole('button', { name: 'Keluar rumah', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Dialog cerita' })).toContainText('Wira');
  await page.getByRole('button', { name: 'Lanjutkan cerita' }).click();
  await expect(page.getByRole('region', { name: 'Dialog cerita' })).toContainText('karhutla');
  await page.getByRole('button', { name: 'Lanjutkan cerita' }).click();
  await expect(page.getByRole('region', { name: 'Dialog cerita' })).toContainText('Pak Budi');
  await page.getByRole('button', { name: 'Lanjutkan cerita' }).click();
  await page.getByRole('button', { name: 'Lanjutkan cerita' }).click();

  await page.getByRole('button', { name: 'Menuju Warung Budi', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  for (const price of ['Rp 12.000,00', 'Rp 24.000,00', 'Rp 22.000,00']) await expect(page.getByRole('dialog').getByText(price, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Beli Ember air', exact: true }).click();
  await page.getByRole('button', { name: 'Beli Sepatu baru', exact: true }).click();
  await expect(page.locator('.shop-balance strong')).toHaveText('Rp 0,00');
  await expect(page.getByRole('button', { name: 'Beli Ember besar', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Tutup jendela' }).click();
  await expect(page.locator('.equipment-section')).toContainText('Kecepatan +20%');
  await page.reload();
  await expect(page.locator('.wallet-value')).toHaveText('Rp 0,00');
  await expect(page.locator('.equipment-section')).toContainText('Kecepatan +20%');

  for (let progress = 0; progress < 100; progress += 10) {
    if (progress === 40) {
      await page.getByRole('button', { name: 'Peta desa', exact: true }).click();
      await page.getByRole('button', { name: 'Warung Budi', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Beli Ember besar', exact: true }).click();
      await expect(page.locator('.shop-balance strong')).toHaveText('Rp 0,00');
      await page.getByRole('button', { name: 'Tutup jendela' }).click();
    }
    if (await page.getByRole('button', { name: 'Menuju danau', exact: true }).isVisible()) {
      await page.getByRole('button', { name: 'Menuju danau', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Menuju titik api', exact: true })).toBeVisible();
      if (progress >= 40) await expect(page.locator('.equipment-section')).toContainText('2 / 2 takar air');
    }
    await page.getByRole('button', { name: 'Menuju titik api', exact: true }).click();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', `${progress + 10}`);
    if (progress === 40) await expect(page.locator('.equipment-section')).toContainText('1 / 2 takar air');
  }
  await expect(page.getByRole('dialog')).toContainText('Hutan kembali bernapas.');
  await page.screenshot({ path: 'artifacts/victory.png', fullPage: true });
  await page.getByRole('button', { name: 'Jelajahi desa kembali' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await page.getByRole('button', { name: 'Jeda permainan' }).click();
  await page.getByRole('button', { name: 'Ulang dari awal', exact: true }).click();
  await page.getByRole('button', { name: 'Ya, mulai ulang', exact: true }).click();
  await expect(page.locator('.wallet-value')).toHaveText('Rp 12.000,00');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(errors).toEqual([]);
});

test('movement is frame-rate independent, boots add exactly 20%, and UI is not rendered per frame', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // Import the same engine used by the canvas without altering the visible game's instance.
    const modulePath = '/src/game/engine.ts';
    const { GameEngine } = await import(modulePath);
    const engine = new GameEngine();
    if (!engine.world.muted) engine.toggleMute();
    let emissions = 0;
    const unsub = engine.subscribe(() => emissions++);
    const walk = (frames: number, boots: boolean) => {
      engine.world.scene = 'house'; engine.world.player.x = 400; engine.world.player.y = 400;
      engine.world.player.hasNewShoes = boots; engine.world.path = []; engine.world.panel = null;
      engine.world.dialogue = null; engine.world.action = null;
      engine.setKey('d', true);
      for (let i = 0; i < frames; i++) engine.update(.4 / frames);
      engine.clearKeys(); return engine.world.player.x - 400;
    };
    const normal60 = walk(24, false), normal30 = walk(12, false), boots = walk(24, true);
    const frameEmissions = emissions;
    engine.world.scene = 'village'; engine.world.player.x = 510; engine.world.player.y = 518;
    engine.setKey('s', true); for (let i = 0; i < 60; i++) engine.update(1 / 60);
    engine.clearKeys(); const shoreline = engine.world.player.y;
    const before = engine.world.player.y; engine.update(.03); const stopped = before === engine.world.player.y;
    unsub(); return { normal60, normal30, ratio: boots / normal60, emissions: frameEmissions, shoreline, stopped };
  });
  expect(result.normal60).toBeCloseTo(result.normal30, 5);
  expect(result.ratio).toBeCloseTo(1.2, 5);
  expect(result.emissions).toBeLessThan(8);
  expect(result.shoreline).toBeLessThanOrEqual(532);
  expect(result.stopped).toBeTruthy();
});

test('mobile controls, modal focus, keyboard actions and responsive layout', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.mobile-wallet')).toContainText('Uang Wira');
  const joystick = page.getByRole('button', { name: 'Joystick gerak' });
  await expect(joystick).toBeVisible();
  const rect = (await joystick.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2 + 25, rect.y + rect.height / 2 + 20);
  await page.waitForTimeout(350);
  await expect(joystick).toHaveClass(/is-held/);
  await page.mouse.up();
  await expect(joystick).not.toHaveClass(/is-held/);
  await page.waitForTimeout(5200);
  const savedPosition = await page.evaluate(() => JSON.parse(localStorage.getItem('karhutla-wira-v3')!)?.player);
  expect(savedPosition.x).toBeGreaterThan(445);
  expect(savedPosition.y).toBeGreaterThan(375);
  await page.getByRole('button', { name: 'Panduan', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Bekal petualanganmu');
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Lihat perlengkapan ember di Warung Budi' }).click();
  await expect(page.getByRole('button', { name: 'Beli Ember air', exact: true })).toBeDisabled();
  await page.waitForTimeout(250);
  const modal = (await page.getByRole('dialog').boundingBox())!;
  expect(modal.y).toBeGreaterThanOrEqual(0);
  expect(modal.y + modal.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: 'artifacts/mobile-shop.png' });
  await page.getByRole('button', { name: 'Tutup jendela' }).click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/final-mobile.png', fullPage: true });
  for (const [width,height] of [[320,568],[360,780],[768,1024],[1024,768],[844,390],[1440,900],[1920,1080]]) {
    await page.setViewportSize({width,height}); await page.waitForTimeout(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.game-canvas')).toBeVisible();
  }
  expect(errors).toEqual([]);
  await context.close();
});

test('fullscreen keeps dialogs usable and desktop controls fit short screens', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Layar penuh', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.keyboard.press('b');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement?.contains(document.querySelector('[role="dialog"]')))).toBe(true);
  await page.getByRole('button', { name: 'Tutup jendela' }).click();
  await page.getByRole('button', { name: 'Keluar layar penuh', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  for (const [width,height] of [[1280,720],[1024,768],[1440,900]]) {
    await page.setViewportSize({width,height}); await page.waitForTimeout(150);
    const controls = (await page.locator('.console-controls').boundingBox())!;
    expect(controls.y + controls.height).toBeLessThanOrEqual(height);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: 'artifacts/desktop-compact.png' });
});
test('sprites animate, shoes are called "Sepatu baru" and every pose renders', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(400);
  const sample = () => page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('.game-canvas')!;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) | 0; return h;
  });
  const a = await sample(); await page.waitForTimeout(700); const b = await sample();
  expect(a).not.toBe(b);

  const frames = await page.evaluate(async () => {
    const path = '/src/canvas/sprites.ts';
    const { getFrame } = await import(path);
    const sig = (c: HTMLCanvasElement) => { const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; let h = 0, n = 0; for (let i = 0; i < d.length; i += 4) { h = (h * 33 + d[i] + d[i + 1] * 3 + d[i + 3]) | 0; if (d[i + 3]) n++; } return { h, n }; };
    const out: Record<string, { h: number; n: number }> = {};
    for (const who of ['wira', 'budi', 'pak_rt']) for (const dir of ['down', 'up', 'left', 'right']) for (const pose of ['stand', 'walk', 'pour', 'fill', 'wave', 'point', 'cough']) for (const frame of [0, 1, 2, 3])
      out[`${who}-${dir}-${pose}-${frame}`] = sig(getFrame({ who, dir, pose, frame, blink: false, holding: who === 'wira', newShoes: false, flutter: 0, breath: 0, mouth: false, glance: 0, sway: 0 }));
    const shoes = sig(getFrame({ who: 'wira', dir: 'down', pose: 'stand', frame: 0, blink: false, holding: false, newShoes: true, flutter: 0, breath: 0, mouth: false, glance: 0, sway: 0 }));
    return { out, shoes };
  });
  const walk = [0, 1, 2, 3].map(f => frames.out[`wira-down-walk-${f}`].h);
  expect(new Set(walk).size).toBe(4);
  for (const dir of ['up', 'left', 'right']) expect(new Set([0, 1, 2, 3].map(f => frames.out[`wira-${dir}-walk-${f}`].h)).size).toBeGreaterThanOrEqual(3);
  expect(frames.out['wira-left-stand-0'].h).not.toBe(frames.out['wira-right-stand-0'].h);
  expect(frames.shoes.h).not.toBe(frames.out['wira-down-stand-0'].h);
  Object.values(frames.out).forEach(f => expect(f.n).toBeGreaterThan(150));

  await page.keyboard.press('b');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Sepatu baru' })).toBeVisible();
  await expect(dialog.getByText(/sepatu bot|boots/i)).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/shop-new-shoes.png' });
  expect(errors).toEqual([]);
});

test('signs are layered, swing on damped physics and the scene holds 60fps', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');

  const sign = await page.evaluate(async () => {
    const signs = await import('/src/canvas/signs.ts');
    const phys = await import('/src/canvas/physics.ts');
    const c = document.createElement('canvas'); c.width = 420; c.height = 300;
    const x = c.getContext('2d')!; x.imageSmoothingEnabled = false;
    const count = (m: (r: number, g: number, b: number) => boolean) => {
      const d = x.getImageData(0, 0, 420, 300).data; let k = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && m(d[i], d[i + 1], d[i + 2])) k++;
      return k;
    };
    // layered post sign: paint, carved ink, carve shadow, moss, iron bolts, bare wood
    signs.drawSign(x, { id: 'layered', x: 210, y: 250, t: 0, dt: 0, wind: { dir: 0, power: 0, gust: 0, turb: 0 }, reduced: true,
      style: { label: 'DANAU', sub: 'ISI AIR', kind: 'post', posts: 2, w: 84, h: 32, paint: '#2f6d70', paintLight: '#54a0a0', paintShade: '#1d4a4d', ink: '#e8f7f0', scale: 2 } });
    const layers = {
      paint: count((r, g, b) => Math.abs(r - 47) < 26 && Math.abs(g - 109) < 30 && Math.abs(b - 112) < 34),
      ink: count((r, g, b) => r > 200 && g > 220 && b > 200),
      carveShadow: count((r, g, b) => r < 40 && g < 40 && b < 40),
      moss: count((r, g, b) => g > 110 && r > 80 && r < 150 && b < 110),
      iron: count((r, g, b) => Math.abs(r - 154) < 30 && Math.abs(g - 165) < 30 && Math.abs(b - 154) < 30),
      wood: count((r, g, b) => Math.abs(r - 107) < 30 && Math.abs(g - 81) < 28 && Math.abs(b - 54) < 28),
    };

    // hanging sign: a bump swings it, then it settles; wind alone keeps a small sway
    const hang: any = { label: 'BUKA', kind: 'hanging', w: 48, h: 22, paint: '#2f5d4a', paintLight: '#4d8468', paintShade: '#1d3d30', ink: '#f0e3bb', scale: 2 };
    const centroid = () => {
      const d = x.getImageData(0, 0, 420, 300).data; let s = 0, k = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && d[i] > 215 && d[i + 1] > 195 && d[i + 2] > 150) { s += (i / 4) % 420; k++; }
      return k ? s / k : -1;
    };
    const amp = (a: number[]) => Math.max(...a) - Math.min(...a);
    signs.bumpSign('swings', 4.2);
    const kicked: number[] = [];
    for (let i = 0; i < 420; i++) {
      x.clearRect(0, 0, 420, 300);
      signs.drawSign(x, { id: 'swings', style: hang, x: 210, y: 40, t: i / 60, dt: 1 / 60, wind: { dir: 0, power: 0, gust: 0, turb: 0 }, reduced: false });
      if (i % 6 === 0) kicked.push(centroid());
    }
    const windy: number[] = [];
    for (let i = 0; i < 600; i++) {
      x.clearRect(0, 0, 420, 300);
      signs.drawSign(x, { id: 'windy', style: hang, x: 210, y: 40, t: i / 60, dt: 1 / 60, wind: phys.windAt(500, 300, i / 60), reduced: false });
      if (i % 10 === 0) windy.push(centroid());
    }
    return { layers, firstSecond: amp(kicked.slice(0, 10)), settled: amp(kicked.slice(-10)), windSway: amp(windy) };
  });

  for (const [name, px] of Object.entries(sign.layers)) expect(px, `${name} layer`).toBeGreaterThan(5);
  expect(sign.firstSecond).toBeGreaterThan(0.3);
  expect(sign.settled).toBeLessThan(sign.firstSecond / 4);
  expect(sign.windSway).toBeGreaterThan(0.4);

  // leave the house so the village (fires, trees, signs, hens) is on screen
  await page.getByRole('button', { name: 'Keluar rumah', exact: true }).click();
  await page.getByRole('button', { name: 'Lewati cerita' }).waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: 'Lewati cerita' }).click();
  await page.waitForTimeout(1200);

  // Sprite layers are baked once and cached: a warm window must allocate almost nothing.
  const measure = () => page.evaluate(() => {
    let made = 0;
    const real = document.createElement.bind(document);
    (document as any).createElement = (tag: string) => { if (String(tag).toLowerCase() === 'canvas') made++; return real(tag as any); };
    return new Promise(res => {
      let n = 0; const t0 = performance.now();
      const loop = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(loop); else {
        (document as any).createElement = real;
        res({ fps: n / ((performance.now() - t0) / 1000), frames: n, canvasesCreated: made });
      } };
      requestAnimationFrame(loop);
    });
  }) as Promise<{ fps: number; frames: number; canvasesCreated: number }>;

  const warmup = await measure();
  const warm = await measure();
  expect(warmup.fps).toBeGreaterThan(40);
  expect(warm.fps).toBeGreaterThan(40);
  // one-off bakes are fine (a new pose may appear at any time), a rebuild per frame is not
  expect(warmup.canvasesCreated).toBeLessThan(warmup.frames / 4);
  expect(warm.canvasesCreated).toBeLessThan(warm.frames / 6);
  expect(errors).toEqual([]);
});

test('mobile touch can tap the smaller door sign and use the one-tap mission action', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const canvas = (await page.locator('.game-canvas').boundingBox())!;
  const scale = Math.max(.72, Math.min(canvas.width / 840, canvas.height / 570));
  const cx = 435, cy = 340;
  await page.touchscreen.tap(canvas.x + canvas.width / 2 + (351 - cx) * scale, canvas.y + canvas.height / 2 + (511 - cy) * scale);
  await expect(page.getByRole('button', { name: 'Lewati cerita' })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.mobile-action')).toContainText('Lanjut cerita');
  await page.getByRole('button', { name: 'Lewati cerita' }).click();
  const action = page.locator('.mobile-action');
  await expect(action).toContainText('Menuju Warung Budi');
  await action.click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('dialog')).toContainText('Warung Budi');
  expect(errors).toEqual([]);
  await context.close();
});

test('sign lettering has fixed legible pixel glyphs and fits the reduced plaques', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { drawPixelText, pixelTextWidth } = await import('/src/canvas/pixelFont.ts');
    const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 25;
    const ctx = canvas.getContext('2d')!;
    drawPixelText(ctx, 'WARUNG BUDI', 50, 2, '#f8e9c4');
    const data = ctx.getImageData(0, 0, 100, 25).data;
    let lit = 0, left = 100, right = 0, top = 25, bottom = 0;
    for (let y = 0; y < 25; y++) for (let x = 0; x < 100; x++) {
      const i = (y * 100 + x) * 4;
      if (data[i + 3] === 0 || data[i] < 200) continue;
      lit++; left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    return { lit, left, right, top, bottom, width: pixelTextWidth('WARUNG BUDI') };
  });
  expect(result.width).toBeLessThan(80);
  expect(result.lit).toBeGreaterThan(100);
  expect(result.left).toBeGreaterThan(10);
  expect(result.right).toBeLessThan(90);
  expect(result.bottom - result.top).toBe(6);
});

test('jetty ripples stay in the water, never on the deck or dry land', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const w = await import('/src/canvas/water.ts');
    const mod = await import('/src/canvas/pixelRenderer.ts');
    const { GameEngine } = await import('/src/game/engine.ts');
    const { RippleField } = await import('/src/canvas/physics.ts');
    const out: Record<string, number | boolean> = {};

    // mask sanity
    out.deckIsNotWater = !w.isWater(440, 580) && !w.isWater(410, 520);
    out.openWaterIsWater = w.isWater(300, 620) && w.isWater(600, 660);
    out.bankIsNotWater = !w.isWater(180, 600) && !w.isWater(440, 760);
    out.fishCannotJumpAcrossDeck = !w.fishJumpStaysInWater(390, 620, 1) && !w.fishJumpStaysInWater(500, 620, -1);
    out.fishCanJumpInOpenWater = w.fishJumpStaysInWater(300, 620, 1);

    // the clip must block the deck AND the land the deck stands on
    const M = document.createElement('canvas'); M.width = 1400; M.height = 820;
    const m = M.getContext('2d')!;
    m.save(); w.clipWater(m); m.fillStyle = '#ff00ff'; m.fillRect(0, 0, 1400, 820); m.restore();
    const magenta = (d: Uint8ClampedArray) => { let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 255) n++; return n; };
    const P = w.PIER;
    out.clipDeck = magenta(m.getImageData(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0).data);
    out.clipLand = magenta(m.getImageData(P.x0, 470, P.x1 - P.x0, 70).data);
    out.clipBank = magenta(m.getImageData(150, 600, 40, 60).data);
    out.clipWaterLeft = magenta(m.getImageData(280, 600, 80, 60).data);
    out.clipWaterRight = magenta(m.getImageData(500, 600, 80, 60).data);

    // ripple sources follow the walker and sit on both sides of the deck
    const shallow = w.pierRippleSpots(440, 508);
    const deep = w.pierRippleSpots(440, 600);
    out.shoreEndSilent = shallow.length === 0;
    out.waterEndActive = deep.length >= 2 && deep.every(([x, y]) => w.isWater(x, y));
    out.straddlesDeck = deep.some(([x]) => x < P.x0) && deep.some(([x]) => x > P.x1);
    out.tracksDepth = w.pierRippleSpots(455, 620)[0][1] > deep[0][1];

    const rf = new RippleField(); rf.add(300, 620, 1, 40);
    const r0 = rf.list[0].r;
    for (let i = 0; i < 30; i++) rf.update(1 / 60);
    out.ringsExpand = rf.list[0].r > r0 + 8;
    for (let i = 0; i < 200; i++) rf.update(1 / 60);
    out.ringsExpire = rf.list.length === 0;

    // walking the jetty must produce rings in the water every frame
    const eng = new GameEngine(); if (!eng.world.muted) eng.toggleMute();
    eng.world.scene = 'village'; eng.world.discovered = true; eng.world.cutscene = -1; eng.world.dialogue = null;
    eng.world.player.x = 442; eng.world.player.y = 500;
    const A = document.createElement('canvas'); A.width = 900; A.height = 620;
    const a = A.getContext('2d')!;
    const view = { x: 442, y: 590, width: 900, height: 620, scale: 1.6 };
    const S = (x: number, y: number) => [Math.round(450 + (x - view.x) * 1.6), Math.round(310 + (y - view.y) * 1.6)];
    const [cx, cy] = S(P.x0 - 52, 552), [dx, dy] = S(P.x0 - 2, 650);
    let crest = 0, frames = 0;
    eng.setKey('s', true);
    for (let i = 0; i < 170; i++) {
      eng.update(1 / 60); mod.renderGameWorld(a, eng.world, view);
      const d = a.getImageData(cx, cy, dx - cx, dy - cy).data;
      let n = 0;
      for (let j = 0; j < d.length; j += 4) if (d[j + 1] > d[j] + 26 && d[j + 1] > 150 && d[j + 2] > 140) n++;
      crest = Math.max(crest, n); if (n > 0) frames++;
    }
    eng.clearKeys();
    out.waterRipplePixels = crest;
    out.framesWithRipples = frames;
    out.reachedPierEnd = Math.round(eng.world.player.y);
    return out;
  });

  expect(result.deckIsNotWater).toBe(true);
  expect(result.openWaterIsWater).toBe(true);
  expect(result.bankIsNotWater).toBe(true);
  expect(result.fishCannotJumpAcrossDeck).toBe(true);
  expect(result.fishCanJumpInOpenWater).toBe(true);
  expect(result.clipDeck).toBe(0);
  expect(result.clipLand).toBe(0);
  expect(result.clipBank).toBe(0);
  expect(result.clipWaterLeft).toBeGreaterThan(4000);
  expect(result.clipWaterRight).toBeGreaterThan(4000);
  expect(result.shoreEndSilent).toBe(true);
  expect(result.waterEndActive).toBe(true);
  expect(result.straddlesDeck).toBe(true);
  expect(result.tracksDepth).toBe(true);
  expect(result.ringsExpand).toBe(true);
  expect(result.ringsExpire).toBe(true);
  expect(result.waterRipplePixels).toBeGreaterThan(80);
  expect(result.framesWithRipples).toBeGreaterThan(150);
  expect(result.reachedPierEnd).toBeGreaterThan(600);
  expect(errors).toEqual([]);
});

test('walking across the lake jetty has no dust, shoe sparks or bucket spray spam', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { FxSystem } = await import('/src/canvas/fx.ts');
    const { DropletField, RippleField } = await import('/src/canvas/physics.ts');
    type Spawn = { kind: string; x?: number; y?: number };
    const fxSpawns: Spawn[] = [];
    const dropSpawns: { x: number; y: number }[] = [];
    const rippleSpawns: { x: number; y: number; strength: number }[] = [];
    const fxAdd = FxSystem.prototype.add;
    const dropAdd = DropletField.prototype.add;
    const rippleAdd = RippleField.prototype.add;
    FxSystem.prototype.add = function (p: any) { fxSpawns.push(p); return fxAdd.call(this, p); };
    DropletField.prototype.add = function (x: number, y: number, ...rest: any[]) { dropSpawns.push({ x, y }); return dropAdd.call(this, x, y, ...rest); };
    RippleField.prototype.add = function (x: number, y: number, strength = 1, speed = 34) { rippleSpawns.push({ x, y, strength }); return rippleAdd.call(this, x, y, strength, speed); };
    try {
      const { GameEngine } = await import('/src/game/engine.ts');
      const { renderGameWorld } = await import('/src/canvas/pixelRenderer.ts');
      const water = await import('/src/canvas/water.ts');
      const engine = new GameEngine();
      if (!engine.world.muted) engine.toggleMute();
      engine.world.scene = 'village'; engine.world.discovered = true; engine.world.cutscene = -1;
      engine.world.dialogue = null; engine.world.panel = null; engine.world.action = null;
      engine.world.fires.forEach(f => { f.intensity = 0; });
      engine.world.collectibles.forEach(item => { item.collected = true; });
      engine.world.player.x = 442; engine.world.player.y = 500; engine.world.player.dir = 'down';
      engine.world.player.bucketType = 'normal'; engine.world.player.ownsNormalBucket = true;
      engine.world.player.hasNewShoes = true; engine.world.player.maxWaterUnits = 1; engine.world.player.waterUnits = 1;
      const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 620;
      const ctx = canvas.getContext('2d')!;
      const view = { x: 442, y: 590, width: 900, height: 620, scale: 1.6 };
      engine.setKey('s', true);
      for (let i = 0; i < 160; i++) {
        engine.update(1 / 60);
        renderGameWorld(ctx, engine.world, view);
      }
      engine.clearKeys();
      for (let i = 0; i < 60; i++) {
        engine.update(1 / 60);
        renderGameWorld(ctx, engine.world, view);
      }
      const deckEffects = fxSpawns.filter(p => p.x !== undefined && p.y !== undefined && water.inDeck(p.x!, p.y!));
      const deckDroplets = dropSpawns.filter(p => water.inDeck(p.x, p.y));
      // Footstep rings originate at the two close pilings. Ignore the lake's
      // unrelated background ripples elsewhere around the open-water area.
      const sourceRings = rippleSpawns.filter(p => p.strength < 0.35 && p.y > 545 && p.y < 640 &&
        (Math.abs(p.x - (water.PIER.x0 - 7)) < 4 || Math.abs(p.x - (water.PIER.x1 + 7)) < 4));
      return {
        playerY: engine.world.player.y,
        debrisOrSparkEventsOnDeck: deckEffects.length,
        deckEffectDetails: deckEffects.map(e => ({kind:e.kind,x:Math.round(e.x!),y:Math.round(e.y!)})),
        dropletsOnDeck: deckDroplets.length,
        pierRippleCount: sourceRings.length,
        worstPierRippleStrength: Math.max(0, ...sourceRings.map(p => p.strength)),
      };
    } finally {
      FxSystem.prototype.add = fxAdd;
      DropletField.prototype.add = dropAdd;
      RippleField.prototype.add = rippleAdd;
    }
  });
  expect(result.playerY).toBeGreaterThan(610);
  expect(result.debrisOrSparkEventsOnDeck).toBe(0);
  expect(result.dropletsOnDeck).toBe(0);
  expect(result.pierRippleCount).toBeLessThanOrEqual(4);
  expect(result.worstPierRippleStrength).toBeLessThan(0.35);
});

test('pixel fire has layered heat, flickers, and scales down with its remaining intensity', async ({ page }) => {
  await page.goto('/');
  const fire = await page.evaluate(async () => {
    const { drawFirePit } = await import('/src/canvas/fire.ts');
    const wind = { dir: .4, power: .4, gust: .3, turb: .1 };
    const sample = (level: number, time: number) => {
      const c = document.createElement('canvas'); c.width = 180; c.height = 150;
      const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
      drawFirePit(ctx, { x: 90, y: 120, t: time, level, seed: 2, wind });
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let alpha = 0, whiteHot = 0, minY = 150; const colors = new Set<string>();
      for (let i = 0; i < d.length; i += 4) if (d[i + 3]) {
        alpha++; const x = (i / 4) % c.width, y = Math.floor(i / 4 / c.width);
        minY = Math.min(minY, y);
        colors.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
        if (x > 70 && x < 110 && d[i] > 240 && d[i + 1] > 205 && d[i + 2] > 130) whiteHot++;
      }
      return { alpha, height: 120 - minY, colors: colors.size, whiteHot };
    };
    const full = sample(1, .3), flicker = sample(1, .41), low = sample(.16, .3), out = sample(0, .3);
    return { full, flicker, low, out };
  });
  expect(fire.full.alpha).toBeGreaterThan(1500);
  expect(fire.full.colors).toBeGreaterThan(18);
  expect(fire.full.whiteHot).toBeGreaterThan(10);
  expect(fire.full.height).toBeGreaterThan(fire.low.height * 2);
  expect(fire.out.alpha).toBe(0);
  expect(fire.full.alpha).not.toBe(fire.flicker.alpha);
});
