<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DynamicExportFromCollection implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    protected Collection $collection;
    protected array $columns;
    protected string $key;

    public function __construct($rows, $key, array $columns = [])
    {
        $this->collection = $rows;
        $this->key = $key;

        $firstRow = $rows->first();

        if (!$firstRow) {
            $this->columns = $columns ?: [];
            return;
        }

        $this->columns = array_map(function ($row) {
            $trans = trans("messages." . $this->key . "." . $row);
            return $trans === "messages." . $this->key . "." . $row ? $row : $trans;
        }, ($columns ?: array_keys($firstRow->toArray())));
    }

    public function collection(): Collection
    {
        return $this->collection;
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
