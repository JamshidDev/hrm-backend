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

class OrganizationDevicesExport implements FromCollection, WithHeadings, WithEvents, WithStyles
{
    private Collection $rows;
    private int $maxDepth;

    public function __construct($rows, $maxDepth)
    {
        $this->rows = $rows;
        $this->maxDepth = $maxDepth;
    }

    public function collection(): Collection
    {
        $this->rows = $this->rows->map(function ($row) {
            $data = [
                'id' => $row['id'],
            ];

            for ($i = 1; $i <= $this->maxDepth; $i++) {
                $data["name_level_$i"] = $row["name_level_$i"] ?? null;
            }

            $data['total_devices'] = $row['total_devices'] ?? 0;
            $data['offline_devices'] = $row['offline_devices'] ?? 0;
            $data['totalW'] = $row['totalW'] ?? 0;
            $data['schedule'] = $row['schedule'] ?? 0;
            $data['univer'] = $row['univer'] ?? 0;
            $data['level'] = $row['level'];
            $data['has_child'] = $row['has_child'];

            return $data;
        });

        return $this->rows;
    }

    public function headings(): array
    {
        $headings = ['ID'];
        for ($i = 1; $i <= $this->maxDepth; $i++) {
            $headings[] = "C-{$i}";
        }
        $headings[] = "Total Devices";
        $headings[] = "Offline Devices";
        $headings[] = "1";
        $headings[] = "2";
        $headings[] = "3";
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

                $totalCol = Coordinate::stringFromColumnIndex($this->maxDepth + 2);
                $offlineCol = Coordinate::stringFromColumnIndex($this->maxDepth + 3);

                // Ustunlarni bold qilish
                $sheet->getStyle("{$totalCol}:{$totalCol}")->getFont()->setBold(true);
                $sheet->getStyle("{$offlineCol}:{$offlineCol}")->getFont()->setBold(true);

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
                $sheet->getColumnDimension($endCol)->setWidth(30);
                $levelCol = Coordinate::stringFromColumnIndex($this->maxDepth + 4);
                $hasChildCol = Coordinate::stringFromColumnIndex($this->maxDepth + 5);
//                $sheet->getColumnDimension($levelCol)->setVisible(false);
//                $sheet->getColumnDimension($hasChildCol)->setVisible(false);
            }
        ];
    }
}
