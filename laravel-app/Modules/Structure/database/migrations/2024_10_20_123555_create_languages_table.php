<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('languages', static function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->string('name_ru', 80);
            $table->string('name_en', 80);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('languages');
    }
};
