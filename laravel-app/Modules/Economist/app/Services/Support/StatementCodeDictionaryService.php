<?php

namespace Modules\Economist\Services\Support;

use Modules\Economist\Services\StatementService;

class StatementCodeDictionaryService
{
    public function names(): array
    {
        return StatementService::names();
    }

    public function extractData($data, int $from, int $to): array
    {
        return StatementService::extractData($data, $from, $to);
    }

    public function codeLabel(string $code): string
    {
        return $this->names()[$code] ?? $code;
    }

    public function numberStr(int $num): string
    {
        return StatementService::numberStr($num);
    }
}
