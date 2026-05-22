<?php

namespace Modules\Economist\Services\Support;

readonly class StatementDetailService
{
    public function __construct(
        private StatementCodeDictionaryService $statementCodeDictionaryService,
    ) {
    }

    public function buildDetails($statements): array
    {
        $amounts = [];

        foreach ($statements as $statement) {
            $inBlock = $this->statementCodeDictionaryService->extractData($statement, 1, 600);
            $outBlock = $this->statementCodeDictionaryService->extractData($statement, 856, 999);

            $amounts[] = [
                'worker' => [
                    'full_name' => $statement->full_name,
                    'pin' => $statement->pin,
                    'position' => $statement->position,
                    'main_salary' => $statement->main_salary,
                    'work_time' => $statement->work_time,
                    'year' => $statement->year,
                    'month' => $statement->month,
                    'organization' => $statement->organization->full_name . ' (' . $statement->organization->name . ')',
                ],
                'in' => $inBlock['items'],
                'in_total' => $inBlock['total'],
                'out' => $outBlock['items'],
                'out_total' => $outBlock['total'],
                'in_card' => [
                    'code' => $this->statementCodeDictionaryService->codeLabel('885'),
                    'amount' => $statement->s_885,
                ],
            ];
        }

        return $amounts;
    }
}
