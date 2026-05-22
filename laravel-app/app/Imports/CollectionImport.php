<?php

namespace App\Imports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithCalculatedFormulas;

class CollectionImport implements ToCollection, WithCalculatedFormulas
{

    protected int $headingRow;

    public function __construct($headingRow)
    {
        $this->headingRow = $headingRow;
    }

    public function collection(Collection $collection): void
    {

    }
}
