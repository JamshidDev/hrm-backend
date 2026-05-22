<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Structure\Enums\WorkDayTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('work_days', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained('schedules');
            $table->tinyInteger('day_of_week')->default(0);
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->tinyInteger('type')->default(WorkDayTypeEnum::D->value);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('work_days');
    }
};
