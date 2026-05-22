<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ExportFromCollection implements FromCollection, WithStyles, ShouldAutoSize
{
    protected Collection $collection;

    public function __construct($rows)
    {
        $this->collection = $rows;
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
}
