<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Structure\Enums\HolidayTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('holidays', static function (Blueprint $table) {
            $table->id();
            $table->tinyInteger('type')->default(HolidayTypeEnum::ONE->value);
            $table->string('name')->nullable();
            $table->string('name_ru')->nullable();
            $table->string('name_en')->nullable();
            $table->date('holiday_date');
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('holidays');
    }
};
