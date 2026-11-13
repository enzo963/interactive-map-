import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { chromium } from 'playwright';

const component = await readFile(new URL('../src/components/cards/HeritageCard.jsx', import.meta.url), 'utf8');
const baseStyles = await readFile(new URL('../src/styles/heritage-card.css', import.meta.url), 'utf8');
const refinement = component.match(/const cardRefinementStyles = `([\s\S]*?)`;/)[1];

test('small and large cards retain their original proportions and fill their photo window', async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage();
    for (const width of [178, 320]) {
      await page.setContent(`<style>*{box-sizing:border-box}body{margin:0}p,h3,figure{margin:0}:root{--hb-paper:#f7f3ea;--hb-sand:#ded4c0;--hb-ink:#1d211e} ${baseStyles} ${refinement}</style>
        <div style="width:${width}px"><article class="hb-card hb-card--refined" data-linked="true"><div class="hb-card__frame">
        <header class="hb-card__top"><p>Archive No.<br>HB-DU-0025</p><p>TYPE I</p></header>
        <figure class="hb-card__media"><div class="hb-card__photo"><img class="hb-card__image" alt="Portrait of a church" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='200'%3E%3Crect width='100' height='200' fill='tan'/%3E%3C/svg%3E"></div><figcaption class="hb-card__photo-credit"><a href="https://example.org/photo">Zaxo</a> · <a href="https://example.org/license">CC BY-SA 3.0</a></figcaption></figure>
        <div class="hb-card__body"><h3 class="hb-card__title">Mar Gorgis Cathedral, Zakho</h3><p class="hb-card__category">Church</p><p class="hb-card__place">Duhok · Iraq</p><p class="hb-card__period">20th century CE</p></div>
        <footer class="hb-card__foot"><span>c. 1911 CE</span><span class="hb-card__brand">History in Cards</span></footer></div></article></div>`);
      const measure = () => page.evaluate(() => {
        const box = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
        const image = document.querySelector('.hb-card__image');
        return { card: box('.hb-card'), photo: box('.hb-card__photo'), media: box('.hb-card__media'), foot: box('footer'), fit: getComputedStyle(image).objectFit, transform: getComputedStyle(image).transform };
      });
      const layout = await measure();
      assert.ok(Math.abs(layout.card.height - layout.card.width * 7.4 / 5) < 2, `original card ratio at ${width}px`);
      assert.equal(layout.fit, 'cover', 'photo fills its dedicated window');
      assert.ok(layout.photo.height > 0 && Math.abs(layout.photo.height - layout.media.height) < 1, 'photo fills the available media height');
      assert.ok(layout.foot.bottom <= layout.card.bottom, 'content remains inside the card');
      await page.locator('.hb-card').hover();
      await page.waitForTimeout(750);
      assert.equal((await measure()).transform, 'none', 'hover never crops the photograph');
    }
  } finally {
    await browser.close();
  }
});

test('cards omit the visible photographer and license strip', () => {
  assert.doesNotMatch(component, /<figcaption|hb-card__photo-credit/);
});

test('miniature hero cards give photos the same relative space as full-size cards', async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage();
    const card = '<article class="hb-card hb-card--refined" data-tier="5"><div class="hb-card__frame"><header class="hb-card__top"><p class="hb-card__archive"><span class="hb-card__label">Archive No.</span><span class="hb-card__code">HB-DU-0004</span></p><p class="hb-card__type"><span class="hb-card__type-name">Type V</span><span class="hb-card__rank">Legendary</span></p></header><figure class="hb-card__media"><div class="hb-card__photo"></div></figure><div class="hb-card__body"><p class="hb-card__title">Maltai Rock Reliefs (Halamata Cave)</p><p class="hb-card__category">Rock Relief</p><p class="hb-card__place">Duhok · Iraq</p><p class="hb-card__period">Neo-Assyrian</p></div><footer class="hb-card__foot"><span class="hb-card__date">c. 700 BCE</span><span class="hb-card__brand">History in Cards</span></footer></div></article>';
    await page.setContent(`<style>*{box-sizing:border-box}p,figure{margin:0} ${baseStyles} ${refinement}</style><div class="hb-stack" style="width:160px;height:auto;--card-w:160px">${card}</div><div style="width:320px;--card-w:320px">${card}</div>`);
    const ratios = await page.locator('.hb-card').evaluateAll((cards) => cards.map((card) => card.querySelector('.hb-card__photo').offsetHeight / card.offsetHeight));
    assert.ok(Math.abs(ratios[0] - ratios[1]) < .04, `photo space should scale consistently: ${ratios}`);
    assert.ok(ratios[0] > .45, 'hero photograph should not collapse into a narrow strip');
  } finally { await browser.close(); }
});
