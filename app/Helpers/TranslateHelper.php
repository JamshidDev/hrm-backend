<?php

namespace App\Helpers;

class TranslateHelper
{

    public static function translate($text, $lang): array|string
    {
        if (!$text) {
            return '';
        }

        $cyrToLat = [
            'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e', 'ё' => 'yo',
            'ж' => 'j', 'з' => 'z', 'и' => 'i', 'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm',
            'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u',
            'ф' => 'f', 'х' => 'x', 'ц' => 'ts', 'ч' => 'ch', 'ш' => 'sh', 'щ' => 'sh', 'ъ' => "'",
            'ы' => 'i', 'ь' => ' ', 'э' => 'e', 'ю' => 'yu', 'я' => 'ya', 'Қ' => 'Q', 'қ' => 'q',
            'Ў' => "O‘", 'ў' => "o‘", 'Ғ' => "G‘", 'ғ' => "g‘", 'Ҳ' => 'H', 'ҳ' => 'h',
            'А' => 'A', 'Б' => 'B', 'В' => 'V', 'Г' => 'G', 'Д' => 'D', 'Е' => 'Ye', 'Ё' => 'Yo',
            'Ж' => 'J', 'З' => 'Z', 'И' => 'I', 'Й' => 'Y', 'К' => 'K', 'Л' => 'L', 'М' => 'M',
            'Н' => 'N', 'О' => 'O', 'П' => 'P', 'Р' => 'R', 'С' => 'S', 'Т' => 'T', 'У' => 'U',
            'Ф' => 'F', 'Х' => 'X', 'Ц' => 'Ts', 'Ч' => 'Ch', 'Ш' => 'Sh', 'Щ' => 'Sh', 'Ъ' => "'",
            'Ы' => 'I', 'Ь' => ' ', 'Э' => 'E', 'Ю' => 'Yu', 'Я' => 'Ya',
            "'" => '’', "G’" => 'G‘', "O’" => 'O‘', "g’" => 'g‘', "o’" => 'o‘',
        ];

        $latToCyr = [
            'O‘' => 'Ў', 'G‘' => 'Ғ', 'o‘' => 'ў', 'g‘' => 'ғ',
            "O'" => 'Ў', "G'" => 'Ғ', "o'" => 'ў', "g'" => 'ғ',
            'ya' => 'я', 'Ya' => 'Я', 'Yu' => 'Ю',  'yu' => 'ю', 'yo' => 'ё', 'Yo' => 'Ё',
            'ts' => 'ц', 'ch' => 'ч', 'sh' => 'ш',
            'Ts' => 'Ц', 'Ch' => 'Ч', 'Sh' => 'Ш', ' e' => ' э',
            'a' => 'а', 'b' => 'б', 'v' => 'в', 'g' => 'г', 'd' => 'д', 'e' => 'е',
            'j' => 'ж', 'z' => 'з', 'i' => 'и', 'y' => 'й', 'k' => 'к', 'l' => 'л', 'm' => 'м',
            'n' => 'н', 'o' => 'о', 'p' => 'п', 'r' => 'р', 's' => 'с', 't' => 'т', 'u' => 'у',
            'f' => 'ф', 'x' => 'х', "'" => 'ъ', 'h' => 'ҳ', 'q' => 'қ',

            'A' => 'А', 'B' => 'Б', 'V' => 'В', 'G' => 'Г', 'D' => 'Д', 'Ye' => 'Е',
            'J' => 'Ж', 'Z' => 'З', 'I' => 'И', 'Y' => 'Й', 'K' => 'К', 'L' => 'Л', 'M' => 'М',
            'N' => 'Н', 'O' => 'О', 'P' => 'П', 'R' => 'Р', 'S' => 'С', 'T' => 'Т', 'U' => 'У',
            'F' => 'Ф', 'X' => 'Х', 'H' => 'Ҳ', 'Q' => 'Қ'
        ];

        if ($lang === 'latin') {
            $text = str_replace(array_keys($cyrToLat), array_values($cyrToLat), $text);
            return self::smartQuotes($text);
        }
        $text = str_replace(array_keys($latToCyr), array_values($latToCyr), $text);
        return self::smartQuotes($text);
    }

    public static function smartQuotes(string $text): string
    {
        $result = '';
        $open = true;

        $length = mb_strlen($text);

        for ($i = 0; $i < $length; $i++) {
            $char = mb_substr($text, $i, 1);
            $charSym = mb_substr($text, $i, 2);
            if ($charSym === '’’') {
                $result .= $open ? '“' : '”';
                $open = !$open;
                ++$i;
            }
            else
            if ($char === '"') {
                $result .= $open ? '“' : '”';
                $open = !$open;
            } else {
                $result .= $char;
            }
        }

        return $result;
    }

}
