<?php

namespace App\Imports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithCalculatedFormulas;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class CollectionImportHeadingRow implements ToCollection, WithHeadingRow, WithCalculatedFormulas
{

    protected int $headingRow;

    public function __construct($headingRow)
    {
        $this->headingRow = $headingRow;
    }

    public function headingRow(): int
    {
        return $this->headingRow;
    }

    public function collection(Collection $collection): void
    {

    }
}
