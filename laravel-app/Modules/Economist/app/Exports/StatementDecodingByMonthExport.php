<?php

namespace Modules\Economist\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StatementDecodingByMonthExport implements FromArray, WithStyles, WithColumnWidths
{
    protected array $data;

    public function __construct($data)
    {
        $this->data = $data;
    }

    public function array(): array
    {
       return $this->data;
    }

    public function styles(Worksheet $sheet): array
    {
        $rowIndex = 0;
        $highestRow = $sheet->getHighestRow();
        $highestColumn = $sheet->getHighestColumn(); // oxirgi ustunni topadi

        foreach ($this->data as $row) {
            $rowIndex++;
            if (!$row['type_name'] || !trim($row['type_code'])) {
                $sheet->getStyle($rowIndex)
                    ->getFont()->setBold(true);
            }

        }

        return [
            1 => ['font' => ['bold' => true]],
            'B' => ['font' => ['bold' => true]],
            'A1:' . $highestColumn . $highestRow => [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_LEFT,
                ],
            ],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 50,
            'B' => 10,
            'C' => 15,
            'D' => 15,
            'E' => 15,
            'F' => 15,
            'G' => 15,
            'H' => 15,
            'I' => 15,
            'J' => 15,
            'K' => 15,
            'L' => 15,
            'M' => 15,
            'N' => 15,
            'O' => 15,
            'P' => 15,
            'Q' => 15,
            'R' => 15
        ];
    }
}
