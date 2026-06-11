// Laravel App\Helpers\TranslateHelper::translate($text, 'latin') parity.
//
// PHP str_replace(array_keys, array_values, text) — keylar AYNAN shu tartibda
// ketma-ket almashtiriladi (har key butun matn bo'ylab, keyin keyingisi).
// Tartib MUHIM (masalan ъ→' keyin '→’), shuning uchun massiv tartibi saqlangan.
// Oxirida smartQuotes() qo'llanadi.

// cyrToLat — Laravel TranslateHelper::$cyrToLat (massiv tartibida).
const CYR_TO_LAT: Array<[string, string]> = [
  ['а', 'a'],
  ['б', 'b'],
  ['в', 'v'],
  ['г', 'g'],
  ['д', 'd'],
  ['е', 'e'],
  ['ё', 'yo'],
  ['ж', 'j'],
  ['з', 'z'],
  ['и', 'i'],
  ['й', 'y'],
  ['к', 'k'],
  ['л', 'l'],
  ['м', 'm'],
  ['н', 'n'],
  ['о', 'o'],
  ['п', 'p'],
  ['р', 'r'],
  ['с', 's'],
  ['т', 't'],
  ['у', 'u'],
  ['ф', 'f'],
  ['х', 'x'],
  ['ц', 'ts'],
  ['ч', 'ch'],
  ['ш', 'sh'],
  ['щ', 'sh'],
  ['ъ', "'"],
  ['ы', 'i'],
  ['ь', ' '],
  ['э', 'e'],
  ['ю', 'yu'],
  ['я', 'ya'],
  ['Қ', 'Q'],
  ['қ', 'q'],
  ['Ў', 'O‘'],
  ['ў', 'o‘'],
  ['Ғ', 'G‘'],
  ['ғ', 'g‘'],
  ['Ҳ', 'H'],
  ['ҳ', 'h'],
  ['А', 'A'],
  ['Б', 'B'],
  ['В', 'V'],
  ['Г', 'G'],
  ['Д', 'D'],
  ['Е', 'Ye'],
  ['Ё', 'Yo'],
  ['Ж', 'J'],
  ['З', 'Z'],
  ['И', 'I'],
  ['Й', 'Y'],
  ['К', 'K'],
  ['Л', 'L'],
  ['М', 'M'],
  ['Н', 'N'],
  ['О', 'O'],
  ['П', 'P'],
  ['Р', 'R'],
  ['С', 'S'],
  ['Т', 'T'],
  ['У', 'U'],
  ['Ф', 'F'],
  ['Х', 'X'],
  ['Ц', 'Ts'],
  ['Ч', 'Ch'],
  ['Ш', 'Sh'],
  ['Щ', 'Sh'],
  ['Ъ', "'"],
  ['Ы', 'I'],
  ['Ь', ' '],
  ['Э', 'E'],
  ['Ю', 'Yu'],
  ['Я', 'Ya'],
  ["'", '’'],
  ['G’', 'G‘'],
  ['O’', 'O‘'],
  ['g’', 'g‘'],
  ['o’', 'o‘'],
];

// Laravel TranslateHelper::smartQuotes — `’’` (ikki curly) → toggling “/”,
// `"` → toggling “/”.
function smartQuotes(text: string): string {
  const chars = Array.from(text); // mb_strlen / mb_substr parity (codepoint)
  let result = '';
  let open = true;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const charSym = chars[i] + (chars[i + 1] ?? '');
    if (charSym === '’’') {
      result += open ? '“' : '”';
      open = !open;
      i++;
    } else if (char === '"') {
      result += open ? '“' : '”';
      open = !open;
    } else {
      result += char;
    }
  }
  return result;
}

// TranslateHelper::translate($text, 'latin').
export function transliterateLatin(text: string | null | undefined): string {
  if (!text) return '';
  let out = text;
  for (const [from, to] of CYR_TO_LAT) {
    out = out.split(from).join(to);
  }
  return smartQuotes(out);
}
