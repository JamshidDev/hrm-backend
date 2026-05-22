<?php

namespace Modules\Economist\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MultiStatementWorkersExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    protected Collection $data;

    public function __construct($data)
    {
        $this->data = $data; // controllerdan keladigan collection
    }

    public function collection(): Collection
    {
        $rows = collect();

        foreach ($this->data as $row) {
            // worker qatorini tayyorlab qo'yamiz (lekin salary emas)
            $first = $row['organizations']->first();
            $rows->push([
                'full_name' => $row['full_name'],
                'pin' => $row['pin'],
                'total_salary' => $row['total_salary'],
                'organization_code' => $first['organization_code'] ?? '',
                'organization' => $first['organization'] ?? '',
                'position' => $first['position'] ?? '',
                'salary' => $first['salary'] ?? 0,
            ]);

            // qolgan organizationlarini ham qo'shamiz
            foreach ($row['organizations']->skip(1) as $org) {
                $rows->push([
                    'full_name' => '', // keyinchalik merge qilamiz
                    'pin' => '',
                    'total_salary' => '',
                    'organization_code' => $org['organization_code'],
                    'organization' => $org['organization'],
                    'position' => $org['position'],
                    'salary' => $org['salary'],
                ]);
            }
        }

        return $rows;
    }

    public function headings(): array
    {
        return [
            trans('messages.export.headers.worker'),
            trans('messages.export.headers.pin'),
            trans('messages.export.headers.total'),
            trans('messages.export.headers.organization_code'),
            trans('messages.export.headers.organization'),
            trans('messages.export.headers.position'),
            trans('messages.export.headers.salary')
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        $rowIndex = 2; // headingdan keyin boshlaymiz

        foreach ($this->data as $row) {
            $count = $row['organizations']->count();

            if ($count > 1) {
                // full_name ustunini vertikal merge qilamiz
                $start = $rowIndex;
                $end = $rowIndex + $count - 1;

                $sheet->mergeCells("A{$start}:A{$end}");
                $sheet->getStyle("A{$start}:A{$end}")->getAlignment()->setVertical('center');
                $sheet->mergeCells("B{$start}:B{$end}");
                $sheet->getStyle("B{$start}:B{$end}")->getAlignment()->setVertical('center');
                $sheet->mergeCells("C{$start}:C{$end}");
                $sheet->getStyle("C{$start}:C{$end}")->getAlignment()->setVertical('center');
            }

            $rowIndex += $count;
        }

        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
