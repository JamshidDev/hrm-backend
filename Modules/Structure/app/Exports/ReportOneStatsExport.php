<?php

namespace Modules\Structure\Exports;

use App\Helpers\Helper;
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

class ReportOneStatsExport implements FromCollection, WithHeadings, WithEvents, WithStyles
{
    private Collection $rows;
    private int $maxDepth;
    private array $statColumns;

    private int $rowNumber = 7;

    private int $year;
    private int $month;

    public function __construct($rows, $maxDepth, $year, $month)
    {
        $this->rows = collect($rows);
        $this->maxDepth = $maxDepth;
        $this->year = $year;
        $this->month = $month;

        // 1-chi row’dan stat column’ларни оламиз
        $firstRow = $this->rows->first() ?? [];

        $this->statColumns = [
            'all_rate', 'workers_count', 'men', 'women',
            'age_under_30', 'age_31_45', 'age_46_plus',
            'higher_men_count', 'higher_women_count', 'higher_count',
            'special_men_count', 'special_women_count', 'special_count',
            'middle_men_count', 'middle_women_count', 'middle_count',
            'pension_count_men', 'pension_count_women', 'pension_age_count',
            'disability_men_count', 'disability_women_count', 'disability_count',
            'vacation_count', 'part_time_contract',
        ];
    }

    public function collection(): Collection
    {
        return $this->rows->map(function ($row) {
            $data = ['id' => $row['id']];
            // Tree level columns
            for ($i = 1; $i <= $this->maxDepth; $i++) {
                $data["name_level_$i"] = $row["name_level_$i"] ?? null;
            }

            // Statistik columns (dynamic)
            foreach ($this->statColumns as $col) {
                $data[$col] = $row[$col] ?? 0;
            }

            // Meta (hidden)
            $data['level'] = $row['level'] ?? 1;
            $data['has_child'] = $row['has_child'] ?? false;

            return $data;
        });
    }

    public function headings(): array
    {
        return [
            [
                '"O‘zbekiston temir yo‘llari" AJ boshqaruv raisining',
            ],
            [
                '2024 yil “04” sentyabrdagi',
            ],
            [
                '561-N sonli buyrug‘iga 1-ilova'
            ],
            [
                ''
            ],
            [
                '"O‘zbekiston temir yo‘llari" AJ korxona va muassasalarda "' . ($this->year ?? now()->year)
                . '" yil "'.(Helper::getMonth($this->month ?? now()->month)).'" oyidagi ishchi-xodimlar to‘g‘risida'
            ],
            [
                'M A ‘ L U M O T'
            ],
            array_merge(
                ['№', 'Korxona nomi'],
                array_fill(0, $this->maxDepth - 1, ' '),
                [
                    'Tasdiqlangan shtat birligi',
                    'Amaldagi xodimlar soni',
                    'Shundan',
                    ' ',
                    '30 yoshgacha',
                    '30-45 yoshgacha',
                    '45 yoshdan yuqori',
                    "Oliy ma'lumotli",
                    ' ',
                    'Jami Oliy',
                    "O‘rta-maxsus",
                    ' ',
                    "Jami o‘rta-maxsus",
                    "O'rta",
                    ' ',
                    "Jami o‘rta",
                    'Pensiya yoshdagilar',
                    ' ',
                    "Jami pensiya yoshdagilar",
                    "Nogironligi mavjud",
                    ' ',
                    "Jami nogironligi mavjud",
                    "Bola parvarishlash ta‘tilida",
                    "FXSH"
                ]
            ),
            array_merge(
                array_fill(0, $this->maxDepth + 1, ' '),
                [
                    ' ',
                    ' ',
                    'Erkak',
                    'Ayol',
                    ' ',
                    ' ',
                    ' ',
                    "Erkak",
                    'Ayol',
                    ' ',
                    "Erkak",
                    'Ayol',
                    " ",
                    "Erkak",
                    'Ayol',
                    " ",
                    'Erkak',
                    'Ayol',
                    " ",
                    "Erkak",
                    'Ayol',
                    " ",
                    " ",
                    " "
                ]
            )
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

                    $colIndex = $row['level'] + 1;
                    $colLetter = Coordinate::stringFromColumnIndex($colIndex);
                    $cell = "{$colLetter}{$rowIndex}";
                    if ($colLetter !== $endCol) {
                        $sheet->mergeCells("{$colLetter}{$rowIndex}:{$endCol}{$rowIndex}");
                    }
                    if (!empty($row['has_child'])) {
                        $sheet->getStyle($cell)
                            ->getFont()
                            ->setBold(true)
                            ->getColor()->setARGB(Color::COLOR_BLUE);
                    }

                    if ($row['id'] === 'Total') {
                        $totalRows = $sheet->getHighestRow();
                        $totalColumn = $sheet->getHighestColumn();
                        $sheet->getStyle("A{$totalRows}:{$totalColumn}{$totalRows}")
                            ->getFont()
                            ->setBold(true);

                        $sheet->getStyle("A{$totalRows}:{$totalColumn}{$totalRows}")->getFill()
                            ->setFillType(Fill::FILL_SOLID)
                            ->getStartColor()
                            ->setARGB('B8CCE4');
                    }
                }

                $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($this->maxDepth + count($this->statColumns) + 2))
                    ->setVisible(false);
                $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($this->maxDepth + count($this->statColumns) + 3))
                    ->setVisible(false);

                $sheet->setShowSummaryBelow(false);
            }
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
        $endRowIndex = $rowIndex + 1;

        $totalRows = $sheet->getHighestRow();
        $totalColumn = $sheet->getHighestColumn();

        $maxDepth = $this->maxDepth;

        /**
         * HEIGHT AND WIDTH
         */

        $sheet->getColumnDimension('A')->setWidth(5);
        for ($i = 1; $i <= $maxDepth; $i++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i))->setWidth(4);
        }
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($maxDepth + 1))->setWidth(20);

        $sheet->getRowDimension(7)->setRowHeight(30);
        $sheet->getRowDimension(8)->setRowHeight(30);
        $sheet->getColumnDimension('I')->setWidth(10);
        $sheet->getColumnDimension('J')->setWidth(10);
        $sheet->getColumnDimension('K')->setWidth(10);
        $sheet->getColumnDimension('W')->setWidth(11);
        $sheet->getColumnDimension('Z')->setWidth(11);
        $sheet->getColumnDimension('AA')->setWidth(11);

        /**
         * HEADER MERGE
         */
        for ($i = 1; $i <= 6; $i++) {
            $sheet->mergeCells("A{$i}:{$totalColumn}{$i}");
        }

        /**
         * ALIGNMENTS
         */
        $sheet->getStyle("A1:A3")->getAlignment()->applyFromArray([
            'horizontal' => Alignment::HORIZONTAL_RIGHT,
            'vertical' => Alignment::VERTICAL_CENTER,
            'wrapText' => true
        ]);

        $sheet->getStyle("A5:A6")->getAlignment()->applyFromArray([
            'horizontal' => Alignment::HORIZONTAL_CENTER,
            'vertical' => Alignment::VERTICAL_CENTER,
            'wrapText' => true
        ]);

        /**
         * TABLE BORDER
         */
        $sheet->getStyle("A{$rowIndex}:{$totalColumn}{$totalRows}")
            ->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN
                    ]
                ]
            ]);

        /**
         * HORIZONTAL MERGES
         */
        $horizontalMerges = [
            [4, 5],
            [9, 10],
            [12, 13],
            [15, 16],
            [18, 19],
            [21, 22]
        ];

        foreach ($horizontalMerges as [$start, $end]) {
            $sheet->mergeCells(
                Coordinate::stringFromColumnIndex($maxDepth + $start) .
                $rowIndex . ":" .
                Coordinate::stringFromColumnIndex($maxDepth + $end) .
                $rowIndex
            );
        }

        /**
         * VERTICAL MERGES
         */
        $verticalColumns = [
            1,
            [$maxDepth + 2],
            [$maxDepth + 3],
            [$maxDepth + 6],
            [$maxDepth + 7],
            [$maxDepth + 8],
            [$maxDepth + 11],
            [$maxDepth + 14],
            [$maxDepth + 17],
            [$maxDepth + 20],
            [$maxDepth + 23],
            [$maxDepth + 24],
            [$maxDepth + 25]
        ];

        foreach ($verticalColumns as $col) {
            $colIndex = is_array($col) ? $col[0] : $col;
            $column = Coordinate::stringFromColumnIndex($colIndex);

            $sheet->mergeCells("{$column}{$rowIndex}:{$column}{$endRowIndex}");
        }

        /**
         * SPECIAL MERGES
         */
        $sheet->mergeCells(
            Coordinate::stringFromColumnIndex(2) .
            "{$rowIndex}:" .
            Coordinate::stringFromColumnIndex($maxDepth + 1) .
            (string)($endRowIndex)
        );

        /**
         * FONT BOLD
         */
        $sheet->getStyle("A1:{$totalColumn}{$endRowIndex}")
            ->getFont()
            ->setBold(true);

        /**
         * HEADER ALIGNMENT
         */
        $sheet->getStyle("A{$rowIndex}:{$totalColumn}{$endRowIndex}")
            ->getAlignment()
            ->applyFromArray([
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true
            ]);

        /**
         * COLOR BLOCKS
         */
        $colors = [
            [$maxDepth, $maxDepth + 3, 'B8CCE4'],
            [$maxDepth + 4, $maxDepth + 5, '92D050'],
            [$maxDepth + 6, $maxDepth + 8, 'B8CCE4'],
            [$maxDepth + 9, $maxDepth + 11, '92D050'],
            [$maxDepth + 12, $maxDepth + 14, 'B8CCE4'],
            [$maxDepth + 15, $maxDepth + 17, '92D050'],
            [$maxDepth + 18, $maxDepth + 20, 'B8CCE4'],
            [$maxDepth + 21, $maxDepth + 23, '92D050'],
            [$maxDepth + 24, $maxDepth + 24, 'B8CCE4'],
            [$maxDepth + 25, $maxDepth + 25, 'FFC000']
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
