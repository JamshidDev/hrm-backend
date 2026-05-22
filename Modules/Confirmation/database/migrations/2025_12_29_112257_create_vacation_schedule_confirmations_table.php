<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Traits\ConfirmationColumn;

return new class extends Migration
{
    use ConfirmationColumn;

    public function up(): void
    {
        Schema::create('vacation_schedule_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vacation_schedule_year_id')->nullable()
                ->constrained('vacation_schedule_years')->cascadeOnDelete();
            $this->getTableColumns($table);

            $table->unique(['vacation_schedule_year_id', 'worker_id'], 'vacation_schedule_year_worker_unique');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('vacation_schedule_confirmations');
    }
};
