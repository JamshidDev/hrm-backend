<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DynamicExportFromArray implements FromArray, WithHeadings, WithStyles
{

    protected array $rows;
    protected array $columns;
    protected string $key;

    public function __construct(array $rows, $key, array $columns = [])
    {
        $this->rows = $rows;
        $this->key = $key;
        $this->columns = array_map(function ($row) {
            $trans = trans("messages." . $this->key . "." . $row);
            return $trans === "messages." . $this->key . "." . $row ? $row : $trans;
        }, ($columns ?: array_keys($rows[0] ?? [])));
    }

    public function array(): array
    {
        return $this->rows;
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }

    public function headings(): array
    {
        return $this->columns;
    }
}
