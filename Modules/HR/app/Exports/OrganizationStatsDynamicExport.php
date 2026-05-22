<?php

namespace Modules\HR\Exports;

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

class OrganizationStatsDynamicExport implements FromCollection, WithHeadings, WithEvents, WithStyles
{
    private Collection $rows;
    private int $maxDepth;
    private array $statColumns;

    private int $rowNumber = 7;

    private string $type;

    public function __construct($rows, $maxDepth, $type = 'by-age')
    {
        $this->type = $type;
        $this->rows = collect($rows);
        $this->maxDepth = $maxDepth;

        // 1-chi row’dan stat column’ларни оламиз
        $firstRow = $this->rows->first() ?? [];

        $this->statColumns = collect(array_keys($firstRow))
            ->reject(fn ($key) =>
                $key === 'id'
                || $key === 'level'
                || $key === 'has_child'
                || str_starts_with($key, 'name_level_')
            )
            ->values()
            ->toArray();
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
//        $cols = ['ID'];
//        for ($i = 1; $i <= $this->maxDepth; $i++) {
//            $cols[] = "C-{$i}";
//        }
//
//        foreach ($this->statColumns as $col) {
//            $cols[] = strtoupper(str_replace('_', ' ', $col));
//        }
//        return array_merge($this->getHeader('start'),[$cols]);

        return $this->getHeader('start');
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

    public function getHeader($type): array
    {
        return match ($this->type) {
            'by-education-age-invalid' => $this->getHeaderByEducationAgeInvalid($type)
        };
    }

    public function getStyleEvent($sheet): void
    {
        match ($this->type) {
            'by-education-age-invalid' => $this->getStyleEventByEducationAgeInvalid($sheet)
        };
    }

    public function getHeaderByEducationAgeInvalid($type): array
    {
        if ($type === 'start') {
            return [
                [
                    '"O‘zbekiston temir yo‘llari" AJ boshqaruv rasining',
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
                    '"O‘zbekiston temir yo‘llari" AJ korxona va muassasalarda 2025 yil noyabr oyida ishga qabul qilingan xodimlar to‘g‘risida'
                ],
                [
                    'M A ʼ L U M O T'
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
                        "O'rta-maxsus",
                        ' ',
                        "Jami o'rta-maxsus",
                        "O'rta",
                        ' ',
                        "Jami o'rta",
                        'Pensiya yoshdagilar',
                        ' ',
                        "Jami pensiya yoshdagilar",
                        "Nogironligi mavjud",
                        ' ',
                        "Jami nogironligi mavjud",
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
                        " "
                    ]
                )
            ];
        }
        return [
            [
                'Korxona raxbari',
                '',
                ''
            ]
        ];
    }


    public function getStyleEventByEducationAgeInvalid($sheet): void
    {
        $sheet->getPageSetup()
            ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
            ->setFitToWidth(1)
            ->setFitToHeight(0);

        $sheet->getPageMargins()->setTop(0.5);
        $sheet->getPageMargins()->setRight(0.5);
        $sheet->getPageMargins()->setLeft(0.5);
        $sheet->getPageMargins()->setBottom(0.5);

        $sheet->getPageSetup()->setHorizontalCentered(true);

        $rowIndex = 7;
        $totalRows = $sheet->getHighestRow();
        $totalColumn = $sheet->getHighestColumn();

        $sheet->mergeCells("A1:{$totalColumn}1");
        $sheet->mergeCells("A2:{$totalColumn}2");
        $sheet->mergeCells("A3:{$totalColumn}3");
        $sheet->mergeCells("A4:{$totalColumn}4");
        $sheet->mergeCells("A5:{$totalColumn}5");
        $sheet->mergeCells("A6:{$totalColumn}6");

        $sheet->getStyle("A1:A3")
            ->getAlignment()
            ->applyFromArray(array(
                'horizontal' => Alignment::HORIZONTAL_RIGHT,
                'vertical'   => Alignment::VERTICAL_CENTER,
                'wrapText'   => true
            ));

        $sheet->getStyle("A5:A6")
            ->getAlignment()
            ->applyFromArray(array(
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical'   => Alignment::VERTICAL_CENTER,
                'wrapText'   => true
            ));

        $sheet->getStyle("A{$rowIndex}:" . $totalColumn . $totalRows)->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN
                ],
            ]
        ]);

        $endRowIndex = $rowIndex + 1;
        $maxDepth = $this->maxDepth;

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 4);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 5);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$rowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 9);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 10);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$rowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 12);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 13);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$rowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 15);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 16);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$rowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 18);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 19);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$rowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 21);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 22);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$rowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex(1);
        $endColIndex = Coordinate::stringFromColumnIndex(1);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex(2);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 1);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth+2);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth+2);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth+3);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth+3);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth+6);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth+6);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth+7);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth+7);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth+8);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth+8);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth+11);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth+11);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth+14);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth+14);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth+17);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth+17);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth+20);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth+20);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth+23);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth+23);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth+24);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth+24);
        $sheet->mergeCells("{$startColIndex}{$rowIndex}:{$endColIndex}{$endRowIndex}");


        $endIndex = $rowIndex + 1;
        $sheet->getStyle("A1:{$totalColumn}{$endIndex}")
            ->getFont()
            ->setBold(true);

        $sheet->getStyle("A{$rowIndex}:{$totalColumn}{$endIndex}")
            ->getAlignment()
            ->applyFromArray(array(
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true
            ));


        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 3);
        $sheet->getStyle("{$startColIndex}{$rowIndex}:{$endColIndex}{$rowIndex}")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB('B8CCE4');

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 4);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 5);
        $sheet->getStyle("{$startColIndex}{$rowIndex}:{$endColIndex}{$endIndex}")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB('92D050');

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 6);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 8);
        $sheet->getStyle("{$startColIndex}{$rowIndex}:{$endColIndex}{$endIndex}")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB('B8CCE4');


        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 9);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 11);
        $sheet->getStyle("{$startColIndex}{$rowIndex}:{$endColIndex}{$endIndex}")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB('92D050');

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 12);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 14);
        $sheet->getStyle("{$startColIndex}{$rowIndex}:{$endColIndex}{$endIndex}")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB('B8CCE4');

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 15);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 17);
        $sheet->getStyle("{$startColIndex}{$rowIndex}:{$endColIndex}{$endIndex}")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB('92D050');

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 18);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 20);
        $sheet->getStyle("{$startColIndex}{$rowIndex}:{$endColIndex}{$endIndex}")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB('B8CCE4');

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 21);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 23);
        $sheet->getStyle("{$startColIndex}{$rowIndex}:{$endColIndex}{$endIndex}")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB('92D050');

        $startColIndex = Coordinate::stringFromColumnIndex($maxDepth + 24);
        $endColIndex = Coordinate::stringFromColumnIndex($maxDepth + 24);
        $sheet->getStyle("{$startColIndex}{$rowIndex}:{$endColIndex}{$endIndex}")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setARGB('FFC000');
    }
}
