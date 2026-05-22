<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('nationalities', static function (Blueprint $table) {
            $table->id();
            $table->string('name', 50);
            $table->string('name_ru', 50)->nullable();
            $table->string('name_en', 50)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('nationalities');
    }
};
