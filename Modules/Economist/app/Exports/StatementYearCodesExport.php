<?php

namespace Modules\Economist\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StatementYearCodesExport implements FromArray, WithHeadings, WithStyles, WithEvents
{
    protected array $rows;
    protected array|null $codes;
    protected array $months;
    protected string $type;

    public function __construct(array $rows, $type, $codes)
    {
        $this->type = $type;
        $this->rows = $rows;
        $this->codes = $codes;
        $this->months = [
            1 => 'Yanvar', 2 => 'Fevral', 3 => 'Mart', 4 => 'Aprel', 5 => 'May', 6 => 'Iyun',
            7 => 'Iyul', 8 => 'Avgust', 9 => 'Sentabr', 10 => 'Oktabr', 11 => 'Noyabr', 12 => 'Dekabr'
        ];
    }

    /**
     * DATA
     */
    public function array(): array
    {
        return $this->rows;
    }

    /**
     * HEADER (2 qator)
     */
    public function headings(): array
    {
        $top = ['FIO', 'Lavozim', 'Tashkilot'];
        $bottom = ['', '', ''];

        if ($this->type === 'code') {
            foreach ($this->codes as $code) {
                foreach ($this->months as $month) {
                    $top[] = $code;
                    $bottom[] = $month;
                }
            }
        } else {
            foreach ($this->months as $month) {
                $top[] = 'total_four';
                $bottom[] = $month;
            }
        }

        return [$top, $bottom];
    }

    /**
     * STYLE + MERGE
     */
    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
            2 => ['font' => ['bold' => true]],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {

                $sheet = $event->sheet->getDelegate();

                // merge static columns
                $sheet->mergeCells('A1:A2');
                $sheet->mergeCells('B1:B2');
                $sheet->mergeCells('C1:C2');

                $col = 4; // D column start

                if ($this->type === 'code') {
                    foreach ($this->codes as $code) {
                        $start = $this->colLetter($col);
                        $end = $this->colLetter($col + 11);

                        $sheet->mergeCells($start . "1:$end" . "1");
                        $col += 12;
                    }
                } else {
                    $start = $this->colLetter($col);
                    $end = $this->colLetter($col + 11);
                    $sheet->mergeCells($start . "1:$end" . "1");
                    $col += 12;
                }


                // center align
                $sheet->getStyle('A1:' . $this->colLetter($col - 1) . '2')
                    ->getAlignment()
                    ->setHorizontal('center')
                    ->setVertical('center');
            }
        ];
    }

    private function colLetter($num): string
    {
        $letter = '';
        while ($num > 0) {
            $num--;
            $letter = chr(65 + ($num % 26)) . $letter;
            $num = intdiv($num, 26);
        }
        return $letter;
    }
}
