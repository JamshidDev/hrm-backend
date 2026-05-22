<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\TimeSheet\Enums\TimeSheetTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('time_sheet_workers', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('time_sheet_id')->constrained('time_sheets')->cascadeOnDelete();
            $table->foreignId('worker_position_id')->constrained('worker_positions')->cascadeOnDelete();
            $table->tinyInteger('status')->index()->default(TimeSheetTypeEnum::YA->value);
            $table->date('work_date')->index();
            $table->integer('hours')->default(0);
            $table->string('comment')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['time_sheet_id', 'worker_position_id', 'work_date', 'status'],
                'unique_timesheet_worker_date');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('time_sheet_workers');
    }
};
