<?php

namespace App\Exports;

use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ExportFromQuery implements FromQuery, WithChunkReading, WithHeadings
{
    public function query()
    {
        return DB::connection('mysql_old')
            ->table('accounting_tests as t')
            ->join('accounting_test_categories as t2', 't.accounting_test_category_id', '=', 't2.id')
            ->leftJoin('organizations as o', 't.organization_id', '=', 'o.id')
            ->select(
                't.id',
                't.question',
                't.answer_a',
                't.answer_b',
                't.answer_c',
                't.answer_d',
                't.result',
                'o.name as organization_name',
                't2.name as category_name',
            )
            ->whereNull('t.deleted_at')
            ->orderBy('t.id');
    }

    public function chunkSize(): int
    {
        return 5000;
    }

    public function headings(): array
    {
        return [
            'ID',
            'Question',
            'A',
            'B',
            'C',
            'D',
            'Result',
            'Organization',
            'Category'
        ];
    }
}
