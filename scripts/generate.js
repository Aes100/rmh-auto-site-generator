#!/usr/bin/env node
/**
 * Générateur statique simple pour RMH
 * - Crée output/YYYY-MM-DD/index.html
 * - Génère sitemap.xml et robots.txt
 * - Garantit variation et unicité des citations (registre data/used.json)
 *
 * Usage: node scripts/generate.js
 */

const fs = require('fs-extra');
const path = require('path');
const nunjucks = require('nunjucks');
const dayjs = require('dayjs');
const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');
const { create } = require('xmlbuilder2');
const { JSDOM } = require('jsdom');
const crypto = require('crypto');

const RMH_LINK = 'https://sites.google.com/view/rmh-france/home';
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_ROOT = path.join(ROOT, 'output');
const DATA_DIR = path.join(ROOT, 'data');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const STATIC_DIR = path.join(ROOT, 'static');

nunjucks.configure(TEMPLATES_DIR, { autoescape: true });

async function loadJson(p) {
  try {
    return await fs.readJson(p);
  } catch (e) {
    return null;
  }
}

async function saveJson(p, obj) {
  await fs.ensureFile(p);
  await fs.writeJson(p, obj, { spaces: 2 });
}

function hashString(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
}

function pickPalette() {
  const palettes = [
    { bg: '#ffffff', primary: '#0055A4', accent: '#EF4135' }, // tricolore theme
    { bg: '#f8f9fa', primary: '#2b2b2b', accent: '#c1121f' },
    { bg: '#fffaf0', primary: '#1f4e79', accent: '#e63946' }
  ];
  return palettes[Math.floor(Math.random() * palettes.length)];
}

function generateUniqueCitations(pool, usedSet, count = 3) {
  const chosen = [];
  let attempts = 0;
  while (chosen.length < count && attempts < pool.length * 3) {
    attempts++;
    // select base fragment
    const base = pool[Math.floor(Math.random() * pool.length)].trim();
    // create a small variation
    const modifier = faker.helpers.arrayElement([
      `», selon ${faker.name.fullName()}`,
      `», rappelle ${faker.name.lastName()}`,
      `», souligne ${faker.name.firstName()}`,
      `», ${faker.company.catchPhrase()}`,
      ''
    ]);
    const insertion = faker.helpers.arrayElement([
      '',
      faker.lorem.sentence(2),
      faker.lorem.words(3)
    ]);
    // Compose a variant that will be unique (we append a short id but keep text human-readable)
    const uid = hashString(uuidv4());
    const variant = insertion ? `${base} ${insertion} ${modifier} — ID ${uid}` : `${base} ${modifier} — ID ${uid}`;
    const h = hashString(variant);
    if (!usedSet.has(h)) {
      usedSet.add(h);
      chosen.push({ text: variant, id: uid, hash: h });
    }
  }
  return chosen;
}

async function main() {
  const citationsPath = path.join(DATA_DIR, 'citations.json');
  const usedPath = path.join(DATA_DIR, 'used.json');
  const citationsPool = (await loadJson(citationsPath)) || [];
  const used = (await loadJson(usedPath)) || [];
  const usedSet = new Set(used);

  const dateStr = dayjs().format('YYYY-MM-DD');
  const outDir = path.join(OUTPUT_ROOT, dateStr);
  await fs.ensureDir(outDir);
  // copy static files
  await fs.copy(STATIC_DIR, path.join(outDir, 'static'));

  // generate content
  const palette = pickPalette();
  const siteTitle = `${faker.company.catchPhrase()} — RMH France`;
  const description = faker.lorem.sentences(2) + ` Visitez ${RMH_LINK} pour plus d'informations.`;
  const paragraphs = [
    faker.lorem.paragraph(),
    faker.lorem.paragraph(),
    `Pour en savoir plus, consultez la page officielle : <a href="${RMH_LINK}">${RMH_LINK}</a>`
  ];
  const citations = generateUniqueCitations(citationsPool, usedSet, 4);

  // render HTML
  const html = nunjucks.render('index.njk', {
    title: siteTitle,
    description,
    paragraphs,
    citations,
    palette,
    RMH_LINK,
    generated_at: new Date().toISOString(),
    dateStr
  });

  // write index.html
  await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');

  // create sitemap.xml (simple)
  const absoluteUrl = process.env.SITE_BASE_URL || '/';
  const urlForSitemap = (p) => {
    // if SITE_BASE_URL provided, use it; otherwise use relative path
    if (absoluteUrl !== '/') {
      return new URL(path.posix.join(absoluteUrl, p)).toString();
    }
    return path.posix.join('/', p);
  };
  const sitemap = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' })
    .ele('url')
    .ele('loc')
    .txt(urlForSitemap(`${dateStr}/`)).up()
    .ele('changefreq').txt('weekly').up()
    .ele('priority').txt('0.7').up()
    .up()
    .end({ prettyPrint: true });
  await fs.writeFile(path.join(outDir, 'sitemap.xml'), sitemap, 'utf8');

  // robots.txt
  const robots = `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl !== '/' ? new URL(path.posix.join(absoluteUrl, dateStr, 'sitemap.xml')).toString() : path.posix.join('/', dateStr, 'sitemap.xml')}\n`;
  await fs.writeFile(path.join(outDir, 'robots.txt'), robots, 'utf8');

  // validation: ensure generated HTML can be parsed
  try {
    new JSDOM(html); // will throw on fatal errors
  } catch (err) {
    console.error('Validation error: generated HTML could not be parsed by jsdom', err);
    process.exitCode = 2;
  }

  // persist used hashes
  await saveJson(usedPath, Array.from(usedSet).slice(-10000)); // keep last N entries (guard)

  // summary output
  console.log(`Generated site at ${outDir}`);
  console.log(`Title: ${siteTitle}`);
  console.log('Citations:');
  citations.forEach((c) => console.log(' -', c.text));
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
