<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\UniversityTypeEnum;
use Modules\Structure\Enums\EducationEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('universities', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->nullable()->constrained('cities');
            $table->tinyInteger('education')->default(EducationEnum::HIGH->value)->index();
            $table->tinyInteger('type')->default(UniversityTypeEnum::ONE->value);
            $table->string('name');
            $table->string('name_ru')->nullable();
            $table->string('name_en')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('universities');
    }
};
