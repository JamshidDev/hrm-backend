<?php

namespace Modules\Structure\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ReportTwoStatsExport implements FromCollection, WithHeadings, WithEvents, WithStyles
{
    private Collection $rows;
    private int $maxDepth;
    private array $statColumns;

    private int $rowNumber = 7;

    public function __construct($rows, $maxDepth)
    {
        $this->rows = collect($rows);
        $this->maxDepth = $maxDepth;
        $this->statColumns = [
            'full_name',
            'birthday',
            'position_name',
            'educations',
            'old_organization_name',
            'old_position_name',
            'old_position_date',
            'command',
            'command_reason',
            'type',
        ];
    }

    public function collection(): Collection
    {
        return $this->rows->map(function ($row) {
            $data = ['id' => $row['id']];

            for ($i = 1; $i <= $this->maxDepth; $i++) {
                $data["name_level_$i"] = $row["name_level_$i"] ?? null;
            }

            foreach ($this->statColumns as $col) {
                $data[$col] = $row[$col] ?? '';
            }

            $data['level'] = $row['level'] ?? 1;
            $data['has_child'] = $row['has_child'] ?? false;

            return $data;
        });
    }

    public function headings(): array
    {
        return [
            ['"Ozbekiston temir yollari" AJ boshqaruv raisining'],
            ['2024 yil "04" sentyabrdagi'],
            ['561-N sonli buyrugiga 1-ilova'],
            [''],
            ['"Ozbekiston temir yollari" AJ korxona va muassasalarda ishga qabul qilingan xodimlar to‘g‘risida'],
            ['M A ‘ L U M O T'],
            array_merge(
                ['N', 'Korxona nomi'],
                array_fill(0, $this->maxDepth - 1, ' '),
                [
                    'F.I.Sh.',
                    'Tugilgan sanasi',
                    'Ishga qabul qilingan lavozimi',
                    "Malumoti va mutaxassisligi",
                    'Oldingi mehnat faoliyati',
                    ' ',
                    ' ',
                    "Ishga qabul qilinganligi togrisida",
                    ' ',
                    'Ish faoliyat turi',
                ]
            ),
            array_merge(
                array_fill(0, $this->maxDepth + 5, ' '),
                [
                    'Korxona nomi',
                    'Lavozimi',
                    'Ishdan boshagan sanasi',
                    'Buyruq nomeri va sanasi',
                    'Buyruq asosi',
                    ' ',
                ]
            ),
        ];
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
                $this->getStyleEvent($sheet);
                $endCol = Coordinate::stringFromColumnIndex($this->maxDepth + 1);

                foreach ($this->rows as $index => $row) {
                    $rowIndex = $index + 2 + $this->rowNumber;

                    if (!empty($row['level']) && $row['level'] > 1) {
                        $sheet->getRowDimension($rowIndex)
                            ->setOutlineLevel($row['level'] - 1)
                            ->setCollapsed(false);
                    }

                    $colIndex = min($row['level'] + 1, $this->maxDepth + 1);
                    $colLetter = Coordinate::stringFromColumnIndex($colIndex);
                    $cell = "{$colLetter}{$rowIndex}";

                    if ($colLetter !== $endCol) {
                        $sheet->mergeCells("{$colLetter}{$rowIndex}:{$endCol}{$rowIndex}");
                    }

                    if (!empty($row['has_child'])) {
                        $sheet->getStyle($cell)
                            ->getFont()
                            ->setBold(true)
                            ->getColor()
                            ->setARGB(Color::COLOR_BLUE);
                    }
                }

                $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($this->maxDepth + count($this->statColumns) + 2))
                    ->setVisible(false);
                $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($this->maxDepth + count($this->statColumns) + 3))
                    ->setVisible(false);

                $sheet->setShowSummaryBelow(false);
            },
        ];
    }

    public function getStyleEvent($sheet): void
    {
        $sheet->getPageSetup()
            ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
            ->setFitToWidth(1)
            ->setFitToHeight(0);

        $sheet->getPageMargins()
            ->setTop(0.5)
            ->setRight(0.5)
            ->setLeft(0.5)
            ->setBottom(0.5);

        $sheet->getPageSetup()->setHorizontalCentered(true);

        $rowIndex = 7;
        $endRowIndex = 8;
        $totalRows = $sheet->getHighestRow();
        $totalColumn = $sheet->getHighestColumn();
        $maxDepth = $this->maxDepth;

        $sheet->getRowDimension(7)->setRowHeight(30);
        $sheet->getRowDimension(8)->setRowHeight(30);
        $sheet->getColumnDimension('A')->setWidth(5);

        for ($i = 2; $i <= $maxDepth; $i++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i))->setWidth(4);
        }
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($maxDepth + 1))->setWidth(20);
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($maxDepth + 2))->setWidth(28);
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($maxDepth + 3))->setWidth(16);
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($maxDepth + 4))->setWidth(24);
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($maxDepth + 5))->setWidth(28);
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($maxDepth + 6))->setWidth(24);
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($maxDepth + 7))->setWidth(24);
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($maxDepth + 8))->setWidth(16);
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($maxDepth + 9))->setWidth(24);
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($maxDepth + 10))->setWidth(18);
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($maxDepth + 11))->setWidth(24);

        for ($i = 1; $i <= 6; $i++) {
            $sheet->mergeCells("A{$i}:{$totalColumn}{$i}");
        }

        $sheet->getStyle("A1:A3")->getAlignment()->applyFromArray([
            'horizontal' => Alignment::HORIZONTAL_RIGHT,
            'vertical' => Alignment::VERTICAL_CENTER,
            'wrapText' => true,
        ]);

        $sheet->getStyle("A5:A6")->getAlignment()->applyFromArray([
            'horizontal' => Alignment::HORIZONTAL_CENTER,
            'vertical' => Alignment::VERTICAL_CENTER,
            'wrapText' => true,
        ]);

        $sheet->getStyle("A{$rowIndex}:{$totalColumn}{$totalRows}")->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                ],
            ],
        ]);

        $horizontalMerges = [
            [$maxDepth + 6, $maxDepth + 8],
            [$maxDepth + 9, $maxDepth + 10],
        ];

        foreach ($horizontalMerges as [$start, $end]) {
            $sheet->mergeCells(
                Coordinate::stringFromColumnIndex($start) .
                $rowIndex . ':' .
                Coordinate::stringFromColumnIndex($end) .
                $rowIndex
            );
        }

        $verticalColumns = [
            1,
            $maxDepth + 2,
            $maxDepth + 3,
            $maxDepth + 4,
            $maxDepth + 5,
            $maxDepth + 11,
        ];

        foreach ($verticalColumns as $colIndex) {
            $column = Coordinate::stringFromColumnIndex($colIndex);
            $sheet->mergeCells("{$column}{$rowIndex}:{$column}{$endRowIndex}");
        }

        $sheet->mergeCells(
            Coordinate::stringFromColumnIndex(2) .
            "{$rowIndex}:" .
            Coordinate::stringFromColumnIndex($maxDepth + 1) .
            $endRowIndex
        );

        $sheet->getStyle("A1:{$totalColumn}{$endRowIndex}")
            ->getFont()
            ->setBold(true);

        $sheet->getStyle("A{$rowIndex}:{$totalColumn}{$endRowIndex}")
            ->getAlignment()
            ->applyFromArray([
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ]);

        $colors = [
            [$maxDepth + 2, $maxDepth + 5, 'B8CCE4'],
            [$maxDepth + 6, $maxDepth + 8, 'D9EAD3'],
            [$maxDepth + 9, $maxDepth + 10, 'FFF2CC'],
            [$maxDepth + 11, $maxDepth + 11, 'F4CCCC'],
        ];

        foreach ($colors as [$start, $end, $color]) {
            $startCol = Coordinate::stringFromColumnIndex($start);
            $endCol = Coordinate::stringFromColumnIndex($end);

            $sheet->getStyle("{$startCol}{$rowIndex}:{$endCol}{$endRowIndex}")
                ->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()
                ->setARGB($color);
        }
    }
}
