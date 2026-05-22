<?php

namespace Modules\Confirmation\Traits;

use Illuminate\Database\Schema\Blueprint;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;

trait ConfirmationColumn
{
    public function getTableColumns(Blueprint $table): void
    {
        $table->foreignId('worker_id')->nullable()->constrained('workers')->cascadeOnDelete();
        $table->string('position')->nullable();
        $table->string('type', 2)->index();
        $table->string('file')->nullable();
        $table->text('signature')->nullable();
        $table->tinyInteger('order')->default(1);
        $table->boolean('main')->default(false);
        $table->tinyInteger('confirmation_type')->default(ConfirmationTypeEnum::DIGITAL->value);
        $table->tinyInteger('status')->index()->default(ConfirmationStatusEnum::PROCESS->value);
        $table->timestamps();
        $table->softDeletes();
    }
}
