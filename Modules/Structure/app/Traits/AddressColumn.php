<?php

namespace Modules\Structure\Traits;

use Illuminate\Database\Schema\Blueprint;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;

trait AddressColumn
{
    public function getTableColumns(Blueprint $table): void
    {
        $table->string('name');
        $table->string('name_ru')->nullable();
        $table->string('name_en')->nullable();
        $table->string('lat', 30)->nullable();
        $table->string('long', 30)->nullable();
        $table->timestamps();
        $table->softDeletes();
    }
}
