<?php

namespace Modules\Exam\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\{FromCollection, WithColumnWidths, WithEvents, WithHeadings, WithMapping, WithStyles};
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ExamResultsExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithEvents, WithColumnWidths
{
    protected Collection $data;
    protected array $headings;

    public function __construct(Collection $data, array $headings = [])
    {
        $this->data = $data;
        $this->headings = $headings;
    }

    public function collection(): Collection
    {
        return $this->data->values(); // indeksni tozalab beradi
    }

    public function headings(): array
    {
        $labels = array_map(static function ($role) {
            return trans('messages.export.headers.' . $role);
        }, $this->headings);

        return array_merge(['#'], $labels);
    }

    public function map($row): array
    {
        static $index = 1;
        return array_merge([$index++], collect($this->headings)->map(fn($col) => $row[$col] ?? '')->toArray());
    }

    public function styles(Worksheet $sheet): array
    {
        $columnCount = count($this->headings) + 1;
        $lastColumn = chr(64 + $columnCount); // A, B, C...Z
        return [
            'A1:' . $lastColumn . '1' => ['font' => ['bold' => true]],
            'A' => ['font' => ['bold' => true]], // № ustuni doim bold
            'H' => ['font' => ['bold' => true]],
            'I' => ['font' => ['bold' => true]],
        ];
    }

    public function columnWidths(): array
    {
        $columns = range('A', chr(64 + count($this->headings) + 1)); // A, B, C...
        $short = ['#', 'result'];
        $medium = ['worker', 'created', 'ended'];
        $long = ['exam', 'topic'];

        $widths = [];

        foreach ($columns as $index => $col) {
            $label = $index === 0 ? '#' : $this->headings[$index - 1] ?? '';

            if (in_array($label, $short, true)) {
                $widths[$col] = 10;
            } elseif (in_array($label, $medium, true)) {
                $widths[$col] = 30;
            } elseif (in_array($label, $long, true)) {
                $widths[$col] = 60;
            } else {
                $widths[$col] = 20; // default
            }
        }

        return $widths;
    }


    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                // Freeze first row
                $event->sheet->getDelegate()->freezePane('A2');
            }
        ];
    }
}
