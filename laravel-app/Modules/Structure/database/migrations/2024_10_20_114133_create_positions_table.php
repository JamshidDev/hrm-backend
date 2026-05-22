<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Structure\Enums\PositionCategoryEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('positions', static function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_ru')->nullable();
            $table->string('name_en')->nullable();
            $table->tinyInteger('category')->default(PositionCategoryEnum::M->value);
            $table->string('file')->nullable();
            $table->integer('classification_index')->nullable();
            $table->integer('classification_code')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('positions');
    }
};

