<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Economist\Traits\AggregateColumn;

return new class extends Migration {

    use AggregateColumn;

    public function up(): void
    {
        Schema::create('pension_payment_aggregates', function (Blueprint $table) {
            $this->getTableColumns($table, 'pension_payment_aggregates_unique');
        });
    }



    public function down(): void
    {
        Schema::dropIfExists('pension_payment_aggregates');
    }
};
