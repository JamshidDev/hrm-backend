<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Events\AfterSheet;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\Structure\Models\Organization;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Color;

class StructureDynamicExport implements FromCollection, WithHeadings, WithEvents
{
    private Collection $rows;
    private int $maxDepth = 1;

    public function collection(): Collection
    {
        $organizations = Organization::query()
            ->withCount([
                'worker_positions as indefinite_contracts_count' => function ($q) {
                    $q->whereHas('contract', function ($query) {
                        $query->where('type', ContractTypeEnum::ONE->value);
                    });
                },
                'worker_positions as fixed_contracts_count' => function ($q) {
                    $q->whereHas('contract', function ($query) {
                        $query->where('type', ContractTypeEnum::SIX->value);
                    });
                },
                'worker_positions as civil_contracts_count' => function ($q) {
                    $q->whereHas('contract', function ($query) {
                        $query->where('type', ContractTypeEnum::TWO->value);
                    });
                },
                'worker_positions as part_time_contracts_count' => function ($q) {
                    $q->whereHas('contract', function ($query) {
                        $query->where('type', ContractTypeEnum::THREE->value);
                    });
                },
                'worker_positions as remote_contracts_count' => function ($q) {
                    $q->whereHas('contract', function ($query) {
                        $query->where('type', ContractTypeEnum::FOUR->value);
                    });
                },
                'worker_positions as seasonal_contracts_count' => function ($q) {
                    $q->whereHas('contract', function ($query) {
                        $query->where('type', ContractTypeEnum::FIVE->value);
                    });
                }
            ])
            ->get()
            ->toTree();

        $this->rows = collect();
        $this->flattenTree($organizations);

        return $this->rows->map(function ($row) {
            // Dinamik name_level_x ustunlarni to‘ldirish
            $data = [
                'id' => $row['id'],
            ];

            for ($i = 1; $i <= $this->maxDepth; $i++) {
                $data["name_level_$i"] = $row["name_level_$i"] ?? null;
            }

            $data['indefinite_contracts_count'] = $row['indefinite_contracts_count'];
            $data['fixed_contracts_count'] = $row['fixed_contracts_count'];
            $data['civil_contracts_count'] = $row['civil_contracts_count'];
            $data['part_time_contracts_count'] = $row['part_time_contracts_count'];
            $data['remote_contracts_count'] = $row['remote_contracts_count'];
            $data['seasonal_contracts_count'] = $row['seasonal_contracts_count'];
            $data['level'] = $row['level']; // outline uchun

            return $data;
        });
    }

    public function headings(): array
    {
        $headings = ['ID'];
        for ($i = 1; $i <= $this->maxDepth; $i++) {
            $headings[] = "Name L{$i}";
        }
        $headings[] = 'Address';
        $headings[] = 'Full Name';
        return $headings;
    }

    private function flattenTree($nodes, $level = 1): void
    {
        foreach ($nodes as $node) {
            $row = [
                'id' => $node->id,
                'indefinite_contracts_count' => $node->indefinite_contracts_count,
                'fixed_contracts_count' => $node->fixed_contracts_count,
                'civil_contracts_count' => $node->civil_contracts_count,
                'part_time_contracts_count' => $node->part_time_contracts_count,
                'remote_contracts_count' => $node->remote_contracts_count,
                'seasonal_contracts_count' => $node->seasonal_contracts_count,
                'level' => $level,
                'has_child' => $node->children && $node->children->count() > 0, // 🔑 qo‘shildi
            ];

            // faqat o‘sha leveldagi name ni yozamiz
            $row["name_level_$level"] = $node->name;

            $this->rows->push($row);
            $this->maxDepth = max($this->maxDepth, $level);

            if ($node->children && $node->children->count()) {
                $this->flattenTree($node->children, $level + 1);
            }

        }
    }


    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $endCol = Coordinate::stringFromColumnIndex($this->maxDepth + 1);
                $sheet->getColumnDimension($endCol)->setWidth(30);
                foreach ($this->rows as $index => $row) {
                    $rowIndex = $index + 2; // +1 heading

                    // Guruhlash (outline)
                    if (!empty($row['level']) && $row['level'] > 1) {
                        $sheet->getRowDimension($rowIndex)
                            ->setOutlineLevel($row['level'] - 1)
                            ->setVisible(true)
                            ->setCollapsed(true);
                    }

                    // 🔑 Childlari bo‘lsa — bold qilib yuboramiz
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
            }
        ];
    }

}
