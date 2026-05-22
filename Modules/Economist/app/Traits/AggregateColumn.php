<?php

namespace Modules\Economist\Traits;

use Illuminate\Database\Schema\Blueprint;

trait AggregateColumn
{
    public function getTableColumns(Blueprint $table, $uniqueName): void
    {
        $table->id();
        $table->foreignId('organization_id')->nullable()->constrained('organizations');
        $table->integer('year')->index();
        $table->tinyInteger('month')->index();
        $table->string('column', )->index();
        $table->double('total_sum')->default(0);
        $table->timestamps();
        $table->softDeletes();
        $table->index(['year', 'month']);
        $table->unique(['organization_id', 'year', 'month', 'column'], $uniqueName);
    }
}
