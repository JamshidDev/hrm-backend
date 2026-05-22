<?php

namespace Modules\Exam\Http\Controllers\Concerns;

use Throwable;

trait HandlesExamServiceExceptions
{
    protected function handleExamException(Throwable $e, string $context): never
    {
        throw $e;
    }
}
