<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\SchedulesEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('schedules', static function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->nullable();
            $table->string('name_ru', 100)->nullable();
            $table->string('name_en')->nullable();
            $table->tinyInteger('type')->default(SchedulesEnum::DAILY->value);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};
