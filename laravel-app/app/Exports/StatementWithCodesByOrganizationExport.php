<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StatementWithCodesByOrganizationExport implements FromCollection, WithHeadings, WithEvents, WithStyles
{
    private Collection $rows;
    private int $maxDepth;
    private array $codes;


    public function __construct(array $codes, $rows, $maxDepth)
    {
        $this->codes = $codes;
        $this->rows = $rows;
        $this->maxDepth = $maxDepth;
    }

    public function collection(): Collection
    {
        return $this->rows;
    }

    public function headings(): array
    {
        $headings = ['ID'];
        for ($i = 1; $i <= $this->maxDepth; $i++) {
            $headings[] = "C-{$i}";
        }

        foreach ($this->codes as $code) {
            $headings[] = $code;
        }

        return $headings;
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                $endCol = Coordinate::stringFromColumnIndex($this->maxDepth + 1);

                foreach ($this->rows as $index => $row) {
                    $rowIndex = $index + 2;
                    if (!empty($row['level']) && $row['level'] > 1) {
                        $sheet->getRowDimension($rowIndex)
                            ->setOutlineLevel($row['level'] - 1)
                            ->setVisible(true)
                            ->setCollapsed(true);
                    }
                    if (!empty($row['has_child'])) {
                        $colIndex = $row['level'] + 1;
                        $colLetter = Coordinate::stringFromColumnIndex($colIndex);
                        $cell = "{$colLetter}{$rowIndex}";

                        $sheet->mergeCells("{$colLetter}{$rowIndex}:{$endCol}{$rowIndex}");
                        $sheet->getStyle($cell)
                            ->getFont()->setBold(true)
                            ->getColor()->setARGB(Color::COLOR_BLUE);
                    }
                }

                $sheet->setShowSummaryBelow(false);
                $sheet->getColumnDimension($endCol)->setWidth(30);
                // masalan, level va has_child oxirgi 2 ta ustunda bo‘lsa:
                $levelCol = Coordinate::stringFromColumnIndex($this->maxDepth + count($this->codes) + 2);
                $hasChildCol = Coordinate::stringFromColumnIndex($this->maxDepth + count($this->codes) + 3);
                $sheet->getColumnDimension($levelCol)->setVisible(false);
                $sheet->getColumnDimension($hasChildCol)->setVisible(false);
            }
        ];
    }
}
