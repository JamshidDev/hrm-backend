<?php

namespace Modules\HR\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\{FromCollection, WithColumnWidths, WithEvents, WithHeadings, WithMapping, WithStyles};
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class WorkerExport implements
    FromCollection,
    WithHeadings,
    WithStyles,
    WithColumnWidths,
    WithEvents,
    WithMapping
{
    protected Collection $data;
    protected array $columns;
    protected array $headings;

    public function __construct(Collection $data, array $columns, array $headings = [])
    {
        $this->data = $data;
        $this->columns = $columns;
        $this->headings = $headings ?: $columns;
    }

    public function collection(): Collection
    {
        return $this->data->values();
    }

    public function headings(): array
    {
        $labels = array_map(static function ($role) {
            return trans('messages.worker.' . $role);
        }, $this->headings);

        return array_merge(['№'], $labels);
    }

    public function map($row): array
    {
        static $index = 1;
        return array_merge([$index++], collect($this->columns)->map(fn($col) => $row[$col] ?? '')->toArray());
    }

    public function styles(Worksheet $sheet): array
    {
        $columnCount = count($this->headings) + 1;
        $lastColumn = $this->getExcelColumnNames($columnCount)[$columnCount - 1];

        return [
            'A1:' . $lastColumn . '1' => ['font' => ['bold' => true]],
            'A'                       => ['font' => ['bold' => true]], // № ustuni doim bold
        ];
    }

    public function columnWidths(): array
    {
        $columns = $this->getExcelColumnNames(count($this->headings) + 1);
        $short = ['№', 'sex', 'rate', 'rank', 'id'];
        $medium = ['birthday', 'pin', 'type', 'group' , 'passport_serial_number', 'passport_from_date', 'passport_to_date'];
        $long = ['full_name', 'address', 'position', 'organization', 'department', 'post_name', 'passport_address', 'universities', 'specialities', 'organization_name'];

        $widths = [];

        foreach ($columns as $index => $col) {
            $label = $index === 0 ? '№' : $this->headings[$index - 1] ?? '';

            if (in_array($label, $short, true)) {
                $widths[$col] = 6;
            } elseif (in_array($label, $medium, true)) {
                $widths[$col] = 15;
            } elseif (in_array($label, $long, true)) {
                $widths[$col] = 60;
            } else {
                $widths[$col] = 20; // default
            }
        }

        return $widths;
    }

    private function getExcelColumnNames($count): array
    {
        $columns = [];
        for ($i = 0; $i < $count; $i++) {
            $column = '';
            $x = $i;
            while ($x >= 0) {
                $column = chr($x % 26 + 65) . $column;
                $x = (int)($x / 26) - 1;
            }
            $columns[] = $column;
        }
        return $columns;
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $event->sheet->getDelegate()->freezePane('A2');
            }
        ];
    }
}
