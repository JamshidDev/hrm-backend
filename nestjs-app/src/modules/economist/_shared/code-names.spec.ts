// Unit testlar: kod nomlari lug'ati (3 til × 201 kod).

import {
  getCodeName,
  getCodeNames,
} from '@/modules/economist/_shared/code-names';

describe('Economist · code-names', () => {
  it('uz lug`ati 201 ta kodni o`z ichiga oladi', () => {
    const uz = getCodeNames('uz');
    expect(Object.keys(uz).length).toBe(201);
    expect(uz['001']).toBeTruthy();
    expect(uz['001']).toMatch(/sdelka|ishbay|piecework|haqi/i);
  });

  it('ru lug`ati 201 ta kodni o`z ichiga oladi', () => {
    const ru = getCodeNames('ru');
    expect(Object.keys(ru).length).toBe(201);
    expect(ru['001']).toBeTruthy();
    // Ruscha matnda Кирил harflari bo'lishi kerak
    expect(ru['001']).toMatch(/[А-Яа-яёЁ]/);
  });

  it('en lug`ati 201 ta kodni o`z ichiga oladi', () => {
    const en = getCodeNames('en');
    expect(Object.keys(en).length).toBe(201);
    expect(en['001']).toBeTruthy();
    // Inglizcha — faqat lotin harflari (asosan)
    expect(en['001']).toMatch(/[a-zA-Z]/);
  });

  it('default til (parametr berilmaganda) → uz', () => {
    const def = getCodeNames();
    const uz = getCodeNames('uz');
    expect(def['001']).toBe(uz['001']);
  });

  it('noma`lum til → uz fallback', () => {
    const xx = getCodeNames('zz');
    const uz = getCodeNames('uz');
    expect(xx['001']).toBe(uz['001']);
  });

  it('getCodeName: mavjud kod uchun nom', () => {
    const name = getCodeName('001', 'uz');
    expect(name).toBeTruthy();
    expect(name).not.toBe('001'); // o'zini emas, balki nomini
  });

  it('getCodeName: noma`lum kod uchun kod o`zi qaytadi', () => {
    expect(getCodeName('zzz', 'uz')).toBe('zzz');
  });

  it('Barcha 3 til uchun bir xil kod nabori', () => {
    const uzKeys = Object.keys(getCodeNames('uz')).sort();
    const ruKeys = Object.keys(getCodeNames('ru')).sort();
    const enKeys = Object.keys(getCodeNames('en')).sort();
    expect(ruKeys).toEqual(uzKeys);
    expect(enKeys).toEqual(uzKeys);
  });
});
